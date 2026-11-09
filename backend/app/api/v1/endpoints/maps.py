"""Maps CRUD endpoints for persisting processed graphs to Supabase.

These are plain `def` functions on purpose: the Supabase client is synchronous,
so FastAPI runs them in a thread pool instead of blocking the event loop.
"""

import logging
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from supabase import Client, create_client

from app.config import get_settings
from app.models.graph import AIGraphResponse

logger = logging.getLogger(__name__)

router = APIRouter()


class MapCreate(BaseModel):
    """Schema for creating a new map."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    video_id: str | None = None
    video_url: str | None = None
    graph_data: AIGraphResponse
    raw_transcript: str | None = None


class MapUpdate(BaseModel):
    """Schema for updating a map."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    graph_data: AIGraphResponse | None = None


class MapRecord(BaseModel):
    """Full map record from database."""

    id: str
    name: str
    description: str | None
    video_id: str | None
    video_url: str | None
    graph_data: AIGraphResponse
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


def get_supabase() -> Client:
    """Create a Supabase client, or fail with 503 if it isn't configured."""
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def database_error(action: str, error: Exception) -> HTTPException:
    """Log a database failure and build a response that doesn't leak details."""
    logger.error(f"Failed to {action}: {error}")
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Failed to {action}",
    )


def map_not_found(map_id: UUID) -> HTTPException:
    """Build the 404 response for a missing map."""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Map {map_id} not found",
    )


@router.get(
    "/",
    response_model=MapsListResponse,
    summary="List all maps",
    description="Get a list of all saved maps, ordered by most recent.",
)
def list_maps(limit: int = 50) -> MapsListResponse:
    """List all maps with basic info."""
    client = get_supabase()

    try:
        response = (
            client.table("maps")
            .select("id, name, updated_at")
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception as e:
        raise database_error("list maps", e)

    return MapsListResponse(
        success=True,
        maps=[MapSummary(**row) for row in response.data],
    )


@router.get(
    "/recent",
    response_model=MapsListResponse,
    summary="Get recent maps",
    description="Get the most recently updated maps.",
)
def get_recent_maps(limit: int = 10) -> MapsListResponse:
    """Get recent maps for sidebar."""
    return list_maps(limit=limit)


@router.get(
    "/{map_id}",
    response_model=MapResponse,
    summary="Get a map by ID",
    description="Retrieve a single map with all its data.",
)
def get_map(map_id: UUID) -> MapResponse:
    """Get a single map by ID."""
    client = get_supabase()

    try:
        response = client.table("maps").select("*").eq("id", str(map_id)).execute()
    except Exception as e:
        raise database_error(f"retrieve map {map_id}", e)

    if not response.data:
        raise map_not_found(map_id)

    return MapResponse(
        success=True,
        message="Map retrieved successfully",
        data=MapRecord(**response.data[0]),
    )


@router.post(
    "/",
    response_model=MapResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new map",
    description="Save a processed graph to the database.",
)
def create_map(map_data: MapCreate) -> MapResponse:
    """Create a new map. The database generates the ID and timestamps."""
    client = get_supabase()

    try:
        response = client.table("maps").insert(map_data.model_dump()).execute()
    except Exception as e:
        raise database_error("create map", e)

    return MapResponse(
        success=True,
        message="Map created successfully",
        data=MapRecord(**response.data[0]),
    )


@router.put(
    "/{map_id}",
    response_model=MapResponse,
    summary="Update a map",
    description="Update an existing map's data.",
)
def update_map(map_id: UUID, updates: MapUpdate) -> MapResponse:
    """Update an existing map. A database trigger refreshes updated_at."""
    update_data: dict[str, Any] = updates.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    client = get_supabase()

    try:
        response = (
            client.table("maps").update(update_data).eq("id", str(map_id)).execute()
        )
    except Exception as e:
        raise database_error(f"update map {map_id}", e)

    if not response.data:
        raise map_not_found(map_id)

    return MapResponse(
        success=True,
        message="Map updated successfully",
        data=MapRecord(**response.data[0]),
    )


@router.delete(
    "/{map_id}",
    summary="Delete a map",
    description="Permanently delete a map.",
)
def delete_map(map_id: UUID) -> dict[str, Any]:
    """Delete a map."""
    client = get_supabase()

    try:
        response = client.table("maps").delete().eq("id", str(map_id)).execute()
    except Exception as e:
        raise database_error(f"delete map {map_id}", e)

    if not response.data:
        raise map_not_found(map_id)

    return {"success": True, "message": f"Map {map_id} deleted"}
