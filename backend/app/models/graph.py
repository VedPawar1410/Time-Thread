"""Pydantic models for Graph nodes and edges."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class NodeType(str, Enum):
    """Types of nodes in the conversation graph."""

    TOPIC = "topic"
    SUBTOPIC = "subtopic"
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
