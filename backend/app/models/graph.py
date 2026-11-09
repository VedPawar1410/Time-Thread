"""Pydantic models for the AI-generated conversation graph."""

from pydantic import BaseModel, Field


class ProcessedNode(BaseModel):
    """A node extracted by AI from transcript analysis."""

    id: str
    label: str
    type: str = Field(
        ...,
        description="Node type: 'main', 'subtopic', or 'tangent'",
    )
    start_time: str = Field(
        ...,
        description="Start timestamp in format 'MM:SS' or 'HH:MM:SS'",
    )
    end_time: str = Field(
        ...,
        description="End timestamp in format 'MM:SS' or 'HH:MM:SS'",
    )
    speaker: str | None = Field(
        default=None,
        description="Speaker name/label if identified",
    )
    summary: str = Field(
        ...,
        description="Brief summary of the topic discussed in this segment",
    )


class ProcessedEdge(BaseModel):
    """An edge/relationship extracted by AI from transcript analysis."""

    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    label: str = Field(
        ...,
        description="Relationship type: 'follows', 'interruption', 'return_to_topic', 'branches_to', 'tangent'",
    )


class AIGraphResponse(BaseModel):
    """Structured response from AI transcript processing."""

    nodes: list[ProcessedNode] = Field(
        default_factory=list,
        description="List of topic nodes extracted from transcript",
    )
    edges: list[ProcessedEdge] = Field(
        default_factory=list,
        description="List of relationships between nodes",
    )


class ProcessTranscriptRequest(BaseModel):
    """Request schema for processing a YouTube video transcript."""

    youtube_url: str = Field(
        ...,
        description="YouTube video URL to process",
    )


class ProcessTranscriptResponse(BaseModel):
    """Response schema for transcript processing."""

    success: bool
    message: str
    warning: str | None = None
    map_id: str | None = None  # Set when this video was already saved
    video_id: str | None = None
    title: str | None = None
    graph: AIGraphResponse | None = None
    raw_transcript: str | None = None
