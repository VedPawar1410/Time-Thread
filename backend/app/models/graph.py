"""Pydantic models for Graph nodes and edges."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class NodeType(str, Enum):
    """Types of nodes in the conversation graph."""

    MAIN = "main"  # Main topic/thread
    SUBTOPIC = "subtopic"  # Sub-discussion within a main topic
    TANGENT = "tangent"  # Side question or off-topic discussion
    # Legacy types for backwards compatibility
    TOPIC = "topic"
    QUESTION = "question"
    ANSWER = "answer"
    INSIGHT = "insight"
    QUOTE = "quote"
    REFERENCE = "reference"


class EdgeType(str, Enum):
    """Types of edges connecting nodes."""

    FOLLOWS = "follows"
    BRANCHES_TO = "branches_to"
    REFERENCES = "references"
    RESPONDS_TO = "responds_to"
    CONTAINS = "contains"
    INTERRUPTION = "interruption"  # When speaker interrupts topic
    RETURN_TO_TOPIC = "return_to_topic"  # When conversation returns to previous topic
    TANGENT = "tangent"  # Branching to a tangent


class NodePosition(BaseModel):
    """Position of a node in the canvas."""

    x: float = 0.0
    y: float = 0.0


class NodeData(BaseModel):
    """Data payload for a node."""

    label: str
    content: str = ""
    timestamp_start: float | None = None
    timestamp_end: float | None = None
    speaker: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Node(BaseModel):
    """A node in the conversation graph."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    type: NodeType = NodeType.TOPIC
    position: NodePosition = Field(default_factory=NodePosition)
    data: NodeData


class Edge(BaseModel):
    """An edge connecting two nodes."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    source: str
    target: str
    type: EdgeType = EdgeType.FOLLOWS
    animated: bool = False
    label: str | None = None


class Graph(BaseModel):
    """Complete graph structure with nodes and edges."""

    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str = ""
    nodes: list[Node] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)
    source_type: str | None = None  # youtube, pdf, audio
    source_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GraphCreate(BaseModel):
    """Schema for creating a new graph."""

    name: str
    description: str = ""
    source_type: str | None = None
    source_url: str | None = None


class GraphResponse(BaseModel):
    """API response schema for graph operations."""

    success: bool
    message: str
    data: Graph | None = None


# --- AI Processing Models ---


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
    video_id: str | None = None
    title: str | None = None
    graph: AIGraphResponse | None = None
    raw_transcript: str | None = None
