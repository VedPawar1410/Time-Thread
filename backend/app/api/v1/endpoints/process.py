"""Transcript processing endpoint for AI-powered graph generation."""

import logging

from fastapi import APIRouter, HTTPException, status

from app.models.graph import (
    AIGraphResponse,
    ProcessTranscriptRequest,
    ProcessTranscriptResponse,
)
from app.services.processor import AIProcessingError, get_processor
from app.services.transcription import (
    InvalidVideoURLError,
    TranscriptNotFoundError,
    YouTubeTranscriber,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/process-transcript",
    response_model=ProcessTranscriptResponse,
    summary="Process YouTube transcript into graph",
    description="""
    Accepts a YouTube URL, fetches the video transcript, and uses AI to analyze
    the conversation structure. Returns a graph with nodes (topics, subtopics,
    tangents) and edges (relationships between topics).
    """,
)
async def process_transcript(
    request: ProcessTranscriptRequest,
) -> ProcessTranscriptResponse:
    """
    Process a YouTube video transcript into a structured conversation graph.

    This endpoint:
    1. Extracts the video ID from the YouTube URL
    2. Fetches the transcript using youtube-transcript-api
    3. Sends the transcript to Gemini 1.5 Pro for analysis
    4. Returns a structured graph representing the conversation flow

    Args:
        request: Contains the YouTube URL to process.

    Returns:
        ProcessTranscriptResponse with the generated graph.

    Raises:
        HTTPException 400: If the YouTube URL is invalid.
        HTTPException 404: If no transcript is available for the video.
        HTTPException 500: If AI processing fails.
    """
    youtube_url = request.youtube_url.strip()

    if not youtube_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="YouTube URL is required",
        )
    # Step 1: Fetch transcript from YouTube
    transcriber = YouTubeTranscriber()

    try:
        transcript_result = await transcriber.transcribe(youtube_url)
    except InvalidVideoURLError as e:
        logger.warning(f"Invalid YouTube URL: {youtube_url}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except TranscriptNotFoundError as e:
        logger.warning(f"No transcript found: {youtube_url}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Failed to fetch transcript: {youtube_url}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transcript: {str(e)}",
        )

    video_id = transcript_result.metadata.get("video_id", "")

    # Step 2: Process transcript with AI
    try:
        processor = get_processor()
        graph = await processor.process_transcript(transcript_result.full_text)
    except ValueError as e:
        # Missing API key configuration
        logger.error(f"Configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service is not properly configured. Please set GOOGLE_API_KEY.",
        )
    except AIProcessingError as e:
        logger.error(f"AI processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI processing failed: {str(e)}",
        )
    except Exception as e:
        logger.exception("Unexpected error during processing")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing failed: {str(e)}",
        )

    return ProcessTranscriptResponse(
        success=True,
        message="Transcript processed successfully",
        video_id=video_id,
        title=None,  # Could be fetched separately if needed
        graph=graph,
        raw_transcript=transcript_result.full_text,
    )


@router.post(
    "/analyze",
    response_model=AIGraphResponse,
    summary="Analyze raw transcript text",
    description="Process raw transcript text directly (for testing or non-YouTube sources)",
)
async def analyze_transcript(transcript: str) -> AIGraphResponse:
    """
    Analyze raw transcript text and return graph structure.

    This endpoint is useful for:
    - Testing with custom transcript data
    - Processing transcripts from non-YouTube sources
    - Debugging the AI analysis

    Args:
        transcript: Raw transcript text with timestamps.

    Returns:
        AIGraphResponse with nodes and edges.
    """
    if not transcript or not transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript text is required",
        )

    try:
        processor = get_processor()
        return await processor.process_transcript(transcript)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration error: {str(e)}",
        )
    except AIProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI processing failed: {str(e)}",
        )
