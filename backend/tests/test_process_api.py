"""The transcript endpoint, with YouTube and Gemini replaced by fakes."""

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from youtube_transcript_api import _errors as yt_errors

from app.api.v1.endpoints import process as process_endpoint
from app.main import app
from app.models.graph import AIGraphResponse
from app.services import transcription
from app.services.transcription import YouTubeTranscriber

VIDEO_ID = "dQw4w9WgXcQ"
REQUEST = {"youtube_url": f"https://www.youtube.com/watch?v={VIDEO_ID}"}


class FakeProcessor:
    async def process_transcript(self, transcript):
        return AIGraphResponse(nodes=[], edges=[])


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(process_endpoint, "get_processor", lambda: FakeProcessor())
    return TestClient(app)


def fake_transcript(monkeypatch, entries):
    monkeypatch.setattr(
        YouTubeTranscriber,
        "_fetch_transcript_sync",
        lambda self, video_id: (entries, "en"),
    )


@pytest.mark.parametrize(
    "error, expected_status",
    [
        (yt_errors.IpBlocked(VIDEO_ID), 503),
        (yt_errors.RequestBlocked(VIDEO_ID), 503),
        (yt_errors.VideoUnavailable(VIDEO_ID), 404),
        (yt_errors.InvalidVideoId(VIDEO_ID), 404),
        (yt_errors.VideoUnplayable(VIDEO_ID, "reason", []), 404),
        (yt_errors.AgeRestricted(VIDEO_ID), 404),
        (yt_errors.TranscriptsDisabled(VIDEO_ID), 404),
        (yt_errors.NoTranscriptFound(VIDEO_ID, ["en"], {}), 404),
    ],
)
def test_youtube_failures_map_to_clear_statuses(
    client, monkeypatch, error, expected_status
):
    def fail(self, video_id):
        raise error

    monkeypatch.setattr(YouTubeTranscriber, "_fetch_transcript_sync", fail)

    assert client.post("/api/v1/process-transcript", json=REQUEST).status_code == (
        expected_status
    )


def test_invalid_url_returns_400(client):
    response = client.post(
        "/api/v1/process-transcript", json={"youtube_url": "https://example.com/nope"}
    )

    assert response.status_code == 400


def test_long_transcript_returns_warning(client, monkeypatch):
    fake_transcript(
        monkeypatch,
        [{"text": "a" * 300, "start": float(i), "duration": 1.0} for i in range(500)],
    )

    response = client.post("/api/v1/process-transcript", json=REQUEST)

    assert response.status_code == 200
    assert "only the first" in response.json()["warning"]


def test_short_transcript_has_no_warning(client, monkeypatch):
    fake_transcript(monkeypatch, [{"text": "hi", "start": 0.0, "duration": 1.0}])

    response = client.post("/api/v1/process-transcript", json=REQUEST)

    assert response.status_code == 200
    assert response.json()["warning"] is None


def test_falls_back_to_non_english_transcript(client, monkeypatch):
    hindi = SimpleNamespace(
        fetch=lambda: SimpleNamespace(
            snippets=[SimpleNamespace(text="namaste", start=0.0, duration=2.0)],
            language_code="hi",
        )
    )

    class OnlyHindi:
        def find_transcript(self, languages):
            raise yt_errors.NoTranscriptFound(VIDEO_ID, languages, {})

        def __iter__(self):
            return iter([hindi])

    monkeypatch.setattr(
        transcription,
        "YouTubeTranscriptApi",
        lambda: SimpleNamespace(list=lambda video_id: OnlyHindi()),
    )

    response = client.post("/api/v1/process-transcript", json=REQUEST)

    assert response.status_code == 200
    assert "namaste" in response.json()["raw_transcript"]


def test_analyze_accepts_json_body(client):
    assert client.post("/api/v1/analyze", json="[00:00] hello").status_code == 200
