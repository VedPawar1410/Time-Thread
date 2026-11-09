"""YouTube URL parsing."""

import pytest

from app.services.transcription import InvalidVideoURLError, extract_video_id

VIDEO_ID = "dQw4w9WgXcQ"


@pytest.mark.parametrize(
    "url",
    [
        VIDEO_ID,
        f"https://www.youtube.com/watch?v={VIDEO_ID}",
        f"https://www.youtube.com/watch?list=abc&v={VIDEO_ID}",
        f"https://youtu.be/{VIDEO_ID}?t=5",
        f"https://www.youtube.com/embed/{VIDEO_ID}",
        f"https://www.youtube.com/shorts/{VIDEO_ID}",
        f"https://www.youtube.com/live/{VIDEO_ID}?feature=share",
    ],
)
def test_extracts_video_id(url):
    assert extract_video_id(url) == VIDEO_ID


def test_rejects_unrelated_url():
    with pytest.raises(InvalidVideoURLError):
        extract_video_id("https://example.com/nope")
