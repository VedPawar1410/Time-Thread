"""Transcription processing endpoints."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.transcription import (
    SourceType,
    TranscriptionResult,
    TranscriptionService,
)

router = APIRouter()

# Initialize transcription service
transcription_service = TranscriptionService()


class TranscriptionRequest(BaseModel):
    """Request schema for transcription processing."""

    source: str
    source_type: SourceType


class TranscriptionResponse(BaseModel):
    """Response schema for transcription operations."""

    success: bool
    message: str
    data: TranscriptionResult | None = None


class SupportedTypesResponse(BaseModel):
    """Response schema for supported source types."""

    types: list[str]


@router.get("/supported-types", response_model=SupportedTypesResponse)
async def get_supported_types() -> SupportedTypesResponse:
    """
    Get list of supported transcription source types.

    Returns:
        List of supported source type identifiers.
    """
    return SupportedTypesResponse(
        types=transcription_service.get_supported_types()
    )


@router.post("/process", response_model=TranscriptionResponse)
async def process_transcription(
    request: TranscriptionRequest,
) -> TranscriptionResponse:
    """
    Process a source and extract transcription.

    This is a placeholder endpoint that will be enhanced with
    actual transcription logic in future iterations.

    Args:
        request: Transcription request with source and type.

    Returns:
        Transcription result with extracted content.

    Raises:
        HTTPException: If processing fails or source type unsupported.
    """
    try:
        result = await transcription_service.process(
            source=request.source,
            source_type=request.source_type,
        )
        return TranscriptionResponse(
            success=True,
            message="Transcription processed successfully",
            data=result,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription processing failed: {str(e)}",
        )


@router.post("/youtube", response_model=TranscriptionResponse)
async def process_youtube(url: str) -> TranscriptionResponse:
    """
    Process a YouTube video and extract transcript.

    Args:
        url: YouTube video URL.

    Returns:
        Transcription result from YouTube video.
    """
    result = await transcription_service.process(
        source=url,
        source_type=SourceType.YOUTUBE,
    )
    return TranscriptionResponse(
        success=True,
        message="YouTube transcript extracted",
        data=result,
    )
