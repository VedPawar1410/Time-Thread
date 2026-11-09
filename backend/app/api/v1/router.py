"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1.endpoints import maps, process

api_router = APIRouter()

api_router.include_router(
    process.router,
    prefix="",
    tags=["Processing"],
)

api_router.include_router(
    maps.router,
    prefix="/maps",
    tags=["Maps"],
)
