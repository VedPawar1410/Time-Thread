"""Transcript processing endpoint for AI-powered graph generation."""

import asyncio
import logging
from datetime import date

from fastapi import APIRouter, Body, HTTPException, status

from app.api.v1.endpoints.maps import MapCreate, find_map_by_video_id, insert_map
from app.config import get_settings
from app.models.graph import (
    AIGraphResponse,
    ProcessTranscriptRequest,
    ProcessTranscriptResponse,
)
from app.services.processor import (
    MAX_TRANSCRIPT_CHARS,
    AIProcessingError,
    AIQuotaError,
    get_processor,
)
from app.services.transcription import (
    InvalidVideoURLError,
    TranscriptBlockedError,
    TranscriptNotFoundError,
    YouTubeTranscriber,
    extract_video_id,
    fetch_video_title,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# In memory on purpose: a restart only happens when the server has been idle,
# and sustained abuse keeps it awake and counted.
_daily_usage: dict = {"day": None, "count": 0}


def claim_daily_processing_slot() -> None:
    """Count one AI request, or refuse it once today's limit is reached."""
    limit = get_settings().daily_process_limit
    if limit <= 0:
        return

    today = date.today()
    if _daily_usage["day"] != today:
        _daily_usage.update(day=today, count=0)

    if _daily_usage["count"] >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Today's free processing limit has been reached. "
                "Saved maps still work, and you can try again tomorrow."
            ),
        )
    _daily_usage["count"] += 1


def quota_exhausted(error: AIQuotaError) -> HTTPException:
    """Build the response for a used-up AI quota."""
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=str(error),
    )


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

    try:
        requested_video_id = extract_video_id(youtube_url)
    except InvalidVideoURLError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # A saved video costs nothing to reopen: no YouTube request, no Gemini quota
    saved_map = await asyncio.to_thread(find_map_by_video_id, requested_video_id)
    if saved_map:
        return ProcessTranscriptResponse(
            success=True,
            message="This video was already processed",
            map_id=saved_map.id,
            video_id=requested_video_id,
            title=saved_map.name,
            graph=saved_map.graph_data,
            raw_transcript=saved_map.raw_transcript,
        )

    claim_daily_processing_slot()

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
    except TranscriptBlockedError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
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
    except AIQuotaError as e:
        raise quota_exhausted(e)
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

    transcript_length = len(transcript_result.full_text)
    warning = None
    if transcript_length > MAX_TRANSCRIPT_CHARS:
        analyzed_percent = round(MAX_TRANSCRIPT_CHARS / transcript_length * 100)
        warning = (
            f"This video is very long, so only the first {analyzed_percent}% "
            f"of its transcript was analyzed."
        )

    title = await fetch_video_title(video_id)

    # Saved here, not by the browser, so visitors can't write arbitrary maps
    map_id = None
    try:
        saved = await asyncio.to_thread(
            insert_map,
            MapCreate(
                name=(title or f"Video {video_id}")[:255],
                video_id=video_id,
                video_url=youtube_url,
                graph_data=graph,
                raw_transcript=transcript_result.full_text,
            ),
        )
        map_id = saved.id
    except Exception as e:
        logger.error(f"Failed to save map for {video_id}: {e}")
        warning = " ".join(filter(None, [warning, "This graph could not be saved."]))

    return ProcessTranscriptResponse(
        success=True,
        message="Transcript processed successfully",
        warning=warning,
        map_id=map_id,
        video_id=video_id,
        title=title,
        graph=graph,
        raw_transcript=transcript_result.full_text,
    )


@router.post(
    "/analyze",
    response_model=AIGraphResponse,
    summary="Analyze raw transcript text",
    description="Process raw transcript text directly (for testing or non-YouTube sources)",
)
async def analyze_transcript(transcript: str = Body(...)) -> AIGraphResponse:
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

    claim_daily_processing_slot()

    try:
        processor = get_processor()
        return await processor.process_transcript(transcript)
    except AIQuotaError as e:
        raise quota_exhausted(e)
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
