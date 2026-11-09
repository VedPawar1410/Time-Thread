"""AI-powered transcript processor using Gemini."""

import asyncio
import json
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import ValidationError

from app.config import get_settings
from app.models.graph import AIGraphResponse, ProcessedEdge, ProcessedNode

logger = logging.getLogger(__name__)

# Longer transcripts are cut to this length (about 75k tokens, roughly 5 hours)
MAX_TRANSCRIPT_CHARS = 300_000


SYSTEM_PROMPT = """You are an expert conversation analyst. Your task is to analyze video transcripts and extract a structured conversation graph that shows the flow of topics, tangents, and how discussions connect.

## Your Analysis Should:

1. **Identify Main Topics (type: "main")**
   - These are the primary subjects being discussed
   - New main topics start when the conversation shifts to a completely new subject
   - A long video might have 3-5 main topics

2. **Identify Subtopics (type: "subtopic")**
   - These are deeper discussions within a main topic
   - They expand on or elaborate a main point
   - They stay connected to the parent main topic

3. **Identify Tangents (type: "tangent")**
   - Side questions or off-topic discussions
   - Anecdotes or stories that branch from the main flow
   - These often get "returned from" back to the main discussion

## Edge/Relationship Types:

- **"follows"**: Standard flow from one topic to the next
- **"branches_to"**: When discussion branches to a subtopic
- **"tangent"**: When conversation goes off on a tangent
- **"return_to_topic"**: When conversation returns to a previous topic after a tangent
- **"interruption"**: When a speaker interrupts to change topic

## Rules:

1. Each node must have a unique ID (use format: "node-1", "node-2", etc.)
2. Timestamps should be in "MM:SS" or "HH:MM:SS" format
3. Keep summaries concise (1-2 sentences)
4. Every node except the first should be connected via an edge
5. Identify speakers when possible from context clues
6. Group related content into logical segments (don't create too many tiny nodes)
7. A typical 10-minute video should have 5-15 nodes maximum

## Output Format:

Return a valid JSON object with this exact structure:
{
  "nodes": [
    {
      "id": "node-1",
      "label": "Short Topic Title",
      "type": "main|subtopic|tangent",
      "start_time": "00:00",
      "end_time": "02:30",
      "speaker": "Speaker Name or null",
      "summary": "Brief description of what's discussed"
    }
  ],
  "edges": [
    {
      "source": "node-1",
      "target": "node-2",
      "label": "follows|branches_to|tangent|return_to_topic|interruption"
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, just the raw JSON."""


class ProcessorError(Exception):
    """Base exception for processor errors."""

    pass


class AIProcessingError(ProcessorError):
    """Raised when AI processing fails."""

    pass


class AIQuotaError(AIProcessingError):
    """Raised when the Gemini free-tier quota is used up."""

    pass


class TranscriptProcessor:
    """Service for processing transcripts using Gemini AI."""

    def __init__(self) -> None:
        """Initialize the processor with Gemini model."""
        settings = get_settings()

        if not settings.google_api_key:
            raise ValueError(
                "GOOGLE_API_KEY environment variable is required for AI processing"
            )

        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=0.3,  # Lower temperature for more consistent structured output
            max_output_tokens=32768,  # Long videos produce large graphs
            timeout=120,  # Fail with an error rather than hang on a stuck model
            max_retries=2,
            transport="rest",  # The default gRPC transport hangs on generate calls
        )
        self.parser = JsonOutputParser(pydantic_object=AIGraphResponse)

    async def process_transcript(self, transcript: str) -> AIGraphResponse:
        """
        Process a transcript and extract a conversation graph structure.

        Args:
            transcript: Raw transcript text with timestamps.
                       Format: "[MM:SS] Speaker: Text..." or "[MM:SS] Text..."

        Returns:
            AIGraphResponse containing nodes and edges representing
            the conversation structure.

        Raises:
            AIProcessingError: If the AI fails to process the transcript.
        """
        if not transcript or not transcript.strip():
            raise AIProcessingError("Transcript is empty")

        # Truncate very long transcripts to avoid token limits
        if len(transcript) > MAX_TRANSCRIPT_CHARS:
            logger.warning(
                f"Transcript truncated from {len(transcript)} "
                f"to {MAX_TRANSCRIPT_CHARS} chars"
            )
            transcript = (
                transcript[:MAX_TRANSCRIPT_CHARS]
                + "\n\n[... transcript truncated ...]"
            )

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=f"""Analyze this transcript and extract the conversation graph structure.

TRANSCRIPT:
{transcript}

Remember: Return ONLY the JSON object with "nodes" and "edges" arrays."""
            ),
        ]

        try:
            # ainvoke is broken with REST in this library version, so run the
            # sync call in a worker thread to keep the event loop free.
            response = await asyncio.to_thread(self.llm.invoke, messages)
            # Gemini can return one string or a list of text parts
            response_text = self._clean_json_response(
                self._content_as_text(response.content)
            )

            # Parse JSON response
            try:
                parsed_data = json.loads(response_text)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {e}")
                logger.debug(f"Raw response: {response_text[:500]}...")
                raise AIProcessingError(
                    f"AI returned invalid JSON: {str(e)}"
                )

            # Validate with Pydantic
            try:
                graph_response = self._validate_and_build_response(parsed_data)
            except ValidationError as e:
                logger.error(f"AI response failed validation: {e}")
                raise AIProcessingError(
                    f"AI response structure invalid: {str(e)}"
                )

            return graph_response

        except Exception as e:
            if isinstance(e, AIProcessingError):
                raise
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                raise AIQuotaError(
                    "The free AI quota is used up for now. Please try again later."
                )
            logger.exception("Unexpected error during transcript processing")
            raise AIProcessingError(f"Failed to process transcript: {str(e)}")

    def _content_as_text(self, content: str | list[Any]) -> str:
        """Join a model reply into one string, whichever shape it arrives in."""
        if isinstance(content, str):
            return content
        return "".join(
            part if isinstance(part, str) else part.get("text", "")
            for part in content
        )

    def _clean_json_response(self, text: str) -> str:
        """Remove markdown code blocks and clean up JSON response."""
        # Remove markdown code blocks
        if "```json" in text:
            text = text.split("```json")[1]
            if "```" in text:
                text = text.split("```")[0]
        elif "```" in text:
            parts = text.split("```")
            if len(parts) >= 2:
                text = parts[1]

        return text.strip()

    def _validate_and_build_response(
        self, data: dict[str, Any]
    ) -> AIGraphResponse:
        """Validate parsed data and build AIGraphResponse."""
        nodes = []
        for node_data in data.get("nodes", []):
            nodes.append(
                ProcessedNode(
                    id=node_data.get("id", ""),
                    label=node_data.get("label", ""),
                    type=node_data.get("type", "main"),
                    start_time=node_data.get("start_time", "00:00"),
                    end_time=node_data.get("end_time", "00:00"),
                    speaker=node_data.get("speaker"),
                    summary=node_data.get("summary", ""),
                )
            )

        edges = []
        for edge_data in data.get("edges", []):
            edges.append(
                ProcessedEdge(
                    source=edge_data.get("source", ""),
                    target=edge_data.get("target", ""),
                    label=edge_data.get("label", "follows"),
                )
            )

        return AIGraphResponse(nodes=nodes, edges=edges)


# Singleton instance
_processor: TranscriptProcessor | None = None


def get_processor() -> TranscriptProcessor:
    """Get or create singleton processor instance."""
    global _processor
    if _processor is None:
        _processor = TranscriptProcessor()
    return _processor
