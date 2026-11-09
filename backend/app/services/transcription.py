"""Transcription service for processing various input sources."""

import asyncio
import logging
import re
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any
from xml.etree.ElementTree import ParseError as XMLParseError

from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    AgeRestricted,
    InvalidVideoId,
    NoTranscriptFound,
    RequestBlocked,
    TranscriptsDisabled,
    VideoUnavailable,
    VideoUnplayable,
)

logger = logging.getLogger(__name__)


class SourceType(str, Enum):
    """Supported transcript source types."""

    YOUTUBE = "youtube"
    PDF = "pdf"
    AUDIO = "audio"
    TEXT = "text"


class TranscriptSegment(BaseModel):
    """A segment of transcribed content with timing."""

    text: str
    start: float
    end: float
    speaker: str | None = None


class TranscriptionResult(BaseModel):
    """Result of a transcription operation."""

    source_type: SourceType
    source_identifier: str
    segments: list[TranscriptSegment]
    full_text: str
    metadata: dict[str, Any] = {}
    duration: float | None = None


class TranscriptNotFoundError(Exception):
    """Raised when no transcript is available for a video."""

    pass


class TranscriptBlockedError(Exception):
    """Raised when YouTube refuses transcript requests from this server's IP."""

    pass


class InvalidVideoURLError(Exception):
    """Raised when the YouTube URL is invalid."""

    pass


class BaseTranscriber(ABC):
    """Abstract base class for transcription handlers."""

    @abstractmethod
    async def transcribe(self, source: str) -> TranscriptionResult:
        """Process the source and return transcription result."""
        pass


def extract_video_id(url_or_id: str) -> str:
    """
    Extract YouTube video ID from various URL formats or return as-is if ID.

    Supports:
    - youtube.com/watch?v=VIDEO_ID
    - youtu.be/VIDEO_ID
    - youtube.com/embed/VIDEO_ID
    - youtube.com/v/VIDEO_ID
    - youtube.com/shorts/VIDEO_ID
    - youtube.com/live/VIDEO_ID
    - Raw VIDEO_ID (11 chars)

    Raises:
        InvalidVideoURLError: If the URL/ID format is not recognized.
    """
    # If it looks like a raw video ID (11 alphanumeric chars)
    if re.match(r"^[a-zA-Z0-9_-]{11}$", url_or_id):
        return url_or_id

    # Standard youtube.com/watch?v= format
    match = re.search(r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/v/|youtube\.com/shorts/|youtube\.com/live/)([a-zA-Z0-9_-]{11})", url_or_id)
    if match:
        return match.group(1)

    # Try to extract from query parameter
    match = re.search(r"[?&]v=([a-zA-Z0-9_-]{11})", url_or_id)
    if match:
        return match.group(1)

    raise InvalidVideoURLError(f"Could not extract video ID from: {url_or_id}")


def format_timestamp(seconds: float) -> str:
    """Convert seconds to MM:SS or HH:MM:SS format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


class YouTubeTranscriber(BaseTranscriber):
    """Handles YouTube video transcription."""

    def __init__(self) -> None:
        """Initialize the YouTube transcriber with API client."""
        self._api = YouTubeTranscriptApi()

    def _fetch_transcript_sync(self, video_id: str) -> tuple[list[dict], str]:
        """
        Synchronous method to fetch transcript from YouTube.

        This is separated to run in a thread pool since youtube-transcript-api
        is synchronous.

        Returns:
            Tuple of (transcript_data, language_code)
        """
        # Prefer English (manual over auto-generated), otherwise use whatever
        # language the video has. fetch() alone would only ever ask for English.
        transcripts = self._api.list(video_id)
        try:
            chosen = transcripts.find_transcript(["en"])
        except NoTranscriptFound:
            available = list(transcripts)
            if not available:
                return [], ""
            chosen = available[0]
        transcript = chosen.fetch()

        # Convert FetchedTranscriptSnippet objects to dicts
        transcript_data = []
        for snippet in transcript.snippets:
            transcript_data.append({
                "text": snippet.text,
                "start": snippet.start,
                "duration": snippet.duration,
            })

        return transcript_data, transcript.language_code

    async def transcribe(self, source: str) -> TranscriptionResult:
        """
        Extract transcript from YouTube video.

        Args:
            source: YouTube video URL or ID.

        Returns:
            TranscriptionResult with video transcript.

        Raises:
            TranscriptNotFoundError: If no transcript is available.
            InvalidVideoURLError: If the URL format is invalid.
        """
        video_id = extract_video_id(source)
        logger.info(f"Fetching transcript for video: {video_id}")

        try:
            # Run synchronous API call in thread pool to avoid blocking
            raw_transcript, language = await asyncio.to_thread(
                self._fetch_transcript_sync, video_id
            )

        except RequestBlocked:
            logger.warning(f"YouTube blocked the request for video: {video_id}")
            raise TranscriptBlockedError(
                "YouTube is temporarily blocking transcript requests from this "
                "server. Please try again later."
            )
        except (VideoUnavailable, InvalidVideoId, VideoUnplayable, AgeRestricted):
            logger.warning(f"Video cannot be read: {video_id}")
            raise TranscriptNotFoundError(
                f"This video can't be read. It may be private, deleted or "
                f"age-restricted. Video ID: {video_id}"
            )
        except TranscriptsDisabled:
            logger.warning(f"Transcripts disabled for video: {video_id}")
            raise TranscriptNotFoundError(
                f"Transcripts are disabled for this video. The video owner has "
                f"turned off captions/subtitles. Video ID: {video_id}"
            )
        except NoTranscriptFound:
            logger.warning(f"No transcript found for video: {video_id}")
            raise TranscriptNotFoundError(
                f"No transcript/captions available for this video. "
                f"Video ID: {video_id}"
            )
        except XMLParseError as e:
            logger.error(f"XML parse error for {video_id}: {e}")
            raise TranscriptNotFoundError(
                f"Failed to parse YouTube response. The video may not have "
                f"any captions available. Video ID: {video_id}"
            )
        except Exception as e:
            # Catch XML parsing errors that come through as generic exceptions
            error_msg = str(e).lower()
            if "no element found" in error_msg or "xml" in error_msg:
                logger.error(f"XML/parsing error for {video_id}: {e}")
                raise TranscriptNotFoundError(
                    f"This video does not have captions/subtitles available, "
                    f"or YouTube returned an invalid response. Video ID: {video_id}"
                )
            logger.exception(f"Unexpected error fetching transcript for {video_id}")
            raise

        if not raw_transcript:
            raise TranscriptNotFoundError(
                f"Transcript is empty for video: {video_id}"
            )

        # Convert to our segment format
        segments: list[TranscriptSegment] = []
        for entry in raw_transcript:
            segments.append(
                TranscriptSegment(
                    text=entry["text"],
                    start=entry["start"],
                    end=entry["start"] + entry.get("duration", 0),
                )
            )

        # Build full text with timestamps
        full_text_parts = []
        for segment in segments:
            timestamp = format_timestamp(segment.start)
            full_text_parts.append(f"[{timestamp}] {segment.text}")

        full_text = "\n".join(full_text_parts)

        # Calculate total duration
        duration = segments[-1].end if segments else 0.0

        logger.info(
            f"Successfully fetched transcript for {video_id}: "
            f"{len(segments)} segments, {duration:.1f}s duration, lang={language}"
        )

        return TranscriptionResult(
            source_type=SourceType.YOUTUBE,
            source_identifier=video_id,
            segments=segments,
            full_text=full_text,
            metadata={
                "video_id": video_id,
                "original_url": source,
                "language": language,
            },
            duration=duration,
        )


class PDFTranscriber(BaseTranscriber):
    """Handles PDF document text extraction."""

    async def transcribe(self, source: str) -> TranscriptionResult:
        """
        Extract text content from PDF document.

        Args:
            source: Path to PDF file.

        Returns:
            TranscriptionResult with extracted text.

        TODO: Implement PDF text extraction using PyPDF2.
        """
        return TranscriptionResult(
            source_type=SourceType.PDF,
            source_identifier=source,
            segments=[
                TranscriptSegment(
                    text="Placeholder PDF content",
                    start=0.0,
                    end=0.0,
                )
            ],
            full_text="Placeholder PDF content",
            metadata={"file_path": source},
        )


class AudioTranscriber(BaseTranscriber):
    """Handles audio file transcription."""

    async def transcribe(self, source: str) -> TranscriptionResult:
        """
        Transcribe audio file using speech-to-text.

        Args:
            source: Path to audio file.

        Returns:
            TranscriptionResult with transcribed audio.

        TODO: Implement audio transcription using OpenAI Whisper
              or similar service.
        """
        return TranscriptionResult(
            source_type=SourceType.AUDIO,
            source_identifier=source,
            segments=[
                TranscriptSegment(
                    text="Placeholder audio transcription",
                    start=0.0,
                    end=10.0,
                )
            ],
            full_text="Placeholder audio transcription",
            metadata={"file_path": source},
        )


class TranscriptionService:
    """Main service for handling transcription requests."""

    def __init__(self) -> None:
        """Initialize transcription service with handlers."""
        self._handlers: dict[SourceType, BaseTranscriber] = {
            SourceType.YOUTUBE: YouTubeTranscriber(),
            SourceType.PDF: PDFTranscriber(),
            SourceType.AUDIO: AudioTranscriber(),
        }

    async def process(
        self,
        source: str,
        source_type: SourceType,
    ) -> TranscriptionResult:
        """
        Process a source and return transcription.

        Args:
            source: The source identifier (URL, file path, etc.).
            source_type: Type of source to process.

        Returns:
            TranscriptionResult with processed content.

        Raises:
            ValueError: If source type is not supported.
        """
        handler = self._handlers.get(source_type)
        if not handler:
            raise ValueError(f"Unsupported source type: {source_type}")

        return await handler.transcribe(source)

    def get_supported_types(self) -> list[str]:
        """Return list of supported source types."""
        return [t.value for t in SourceType]
