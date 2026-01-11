"""Maps CRUD endpoints for persisting processed graphs to Supabase."""

import logging
from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────────────────


class ProcessedNode(BaseModel):
    """A node in the graph."""

    id: str
    label: str
    type: str
    start_time: str
    end_time: str
    speaker: str | None = None
    summary: str


class ProcessedEdge(BaseModel):
    """An edge in the graph."""

    source: str
    target: str
    label: str


class GraphData(BaseModel):
    """Complete graph with nodes and edges."""

    nodes: list[ProcessedNode]
    edges: list[ProcessedEdge]


class MapCreate(BaseModel):
    """Schema for creating a new map."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    video_id: str | None = None
    video_url: str | None = None
    graph_data: GraphData
    raw_transcript: str | None = None


class MapUpdate(BaseModel):
    """Schema for updating a map."""

    name: str | None = None
    description: str | None = None
    graph_data: GraphData | None = None


class MapRecord(BaseModel):
    """Full map record from database."""

    id: str
    name: str
    description: str | None
    video_id: str | None
    video_url: str | None
    graph_data: GraphData
    raw_transcript: str | None
    created_at: datetime
    updated_at: datetime


class MapSummary(BaseModel):
    """Lightweight map summary for listing."""

    id: str
    name: str
    updated_at: datetime


class MapsListResponse(BaseModel):
    """Response for list endpoint."""

    success: bool
    maps: list[MapSummary]


class MapResponse(BaseModel):
    """Response for single map operations."""

    success: bool
    message: str
    data: MapRecord | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Supabase Client
# ─────────────────────────────────────────────────────────────────────────────


def get_supabase():
    """Get Supabase client instance."""
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("Supabase credentials not configured")
        return None

    try:
        from supabase import create_client

        return create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    response_model=MapsListResponse,
    summary="List all maps",
    description="Get a list of all saved maps, ordered by most recent.",
)
async def list_maps(limit: int = 50) -> MapsListResponse:
    """List all maps with basic info."""
    client = get_supabase()
    if not client:
        return MapsListResponse(success=True, maps=[])

    try:
        response = (
            client.table("maps")
            .select("id, name, updated_at")
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )

        maps = [
            MapSummary(
                id=row["id"],
                name=row["name"],
                updated_at=row["updated_at"],
            )
            for row in response.data
        ]

        return MapsListResponse(success=True, maps=maps)

    except Exception as e:
        logger.error(f"Failed to list maps: {e}")
        return MapsListResponse(success=False, maps=[])


@router.get(
    "/recent",
    response_model=MapsListResponse,
    summary="Get recent maps",
    description="Get the most recently updated maps.",
)
async def get_recent_maps(limit: int = 10) -> MapsListResponse:
    """Get recent maps for sidebar."""
    return await list_maps(limit=limit)


@router.get(
    "/{map_id}",
    response_model=MapResponse,
    summary="Get a map by ID",
    description="Retrieve a single map with all its data.",
)
async def get_map(map_id: str) -> MapResponse:
    """Get a single map by ID."""
    client = get_supabase()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    try:
        response = client.table("maps").select("*").eq("id", map_id).single().execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Map {map_id} not found",
            )

        return MapResponse(
            success=True,
            message="Map retrieved successfully",
            data=MapRecord(**response.data),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get map {map_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve map: {str(e)}",
        )


@router.post(
    "/",
    response_model=MapResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new map",
    description="Save a processed graph to the database.",
)
async def create_map(map_data: MapCreate) -> MapResponse:
    """Create a new map."""
    client = get_supabase()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    try:
        now = datetime.utcnow().isoformat()
        record = {
            "id": str(uuid4()),
            "name": map_data.name,
            "description": map_data.description,
            "video_id": map_data.video_id,
            "video_url": map_data.video_url,
            "graph_data": map_data.graph_data.model_dump(),
            "raw_transcript": map_data.raw_transcript,
            "created_at": now,
            "updated_at": now,
        }

        response = client.table("maps").insert(record).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create map",
            )

        return MapResponse(
            success=True,
            message="Map created successfully",
            data=MapRecord(**response.data[0]),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create map: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create map: {str(e)}",
        )


@router.put(
    "/{map_id}",
    response_model=MapResponse,
    summary="Update a map",
    description="Update an existing map's data.",
)
async def update_map(map_id: str, updates: MapUpdate) -> MapResponse:
    """Update an existing map."""
    client = get_supabase()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    try:
        update_data: dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}

        if updates.name is not None:
            update_data["name"] = updates.name
        if updates.description is not None:
            update_data["description"] = updates.description
        if updates.graph_data is not None:
            update_data["graph_data"] = updates.graph_data.model_dump()

        response = (
            client.table("maps").update(update_data).eq("id", map_id).execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Map {map_id} not found",
            )

        return MapResponse(
            success=True,
            message="Map updated successfully",
            data=MapRecord(**response.data[0]),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update map {map_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update map: {str(e)}",
        )


@router.delete(
    "/{map_id}",
    summary="Delete a map",
    description="Permanently delete a map.",
)
async def delete_map(map_id: str) -> dict[str, Any]:
    """Delete a map."""
    client = get_supabase()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    try:
        response = client.table("maps").delete().eq("id", map_id).execute()

        return {"success": True, "message": f"Map {map_id} deleted"}

    except Exception as e:
        logger.error(f"Failed to delete map {map_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete map: {str(e)}",
        )
