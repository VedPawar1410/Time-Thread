"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1.endpoints import graphs, process, transcription

api_router = APIRouter()

api_router.include_router(
    graphs.router,
    prefix="/graphs",
    tags=["Graphs"],
)

api_router.include_router(
    transcription.router,
    prefix="/transcription",
    tags=["Transcription"],
)

api_router.include_router(
    process.router,
    prefix="",
    tags=["Processing"],
)
