"""Parsing of Gemini's replies, with the model replaced by a fake."""

import asyncio
from types import SimpleNamespace

import pytest

from app.services.processor import (
    AIProcessingError,
    AIQuotaError,
    TranscriptProcessor,
)

VALID_REPLY = """{
  "nodes": [{"id": "node-1", "label": "Intro", "type": "main",
             "start_time": "00:00", "end_time": "00:30", "summary": "Start"}],
  "edges": []
}"""


def processor_replying_with(text):
    processor = TranscriptProcessor.__new__(TranscriptProcessor)
    processor.llm = SimpleNamespace(invoke=lambda messages: SimpleNamespace(content=text))
    return processor


def test_parses_plain_json():
    graph = asyncio.run(processor_replying_with(VALID_REPLY).process_transcript("x"))

    assert [node.id for node in graph.nodes] == ["node-1"]


def test_parses_json_wrapped_in_code_fence():
    reply = f"```json\n{VALID_REPLY}\n```"

    graph = asyncio.run(processor_replying_with(reply).process_transcript("x"))

    assert len(graph.nodes) == 1


def test_parses_reply_split_into_parts():
    reply = [{"type": "text", "text": VALID_REPLY[:20]}, VALID_REPLY[20:]]

    graph = asyncio.run(processor_replying_with(reply).process_transcript("x"))

    assert len(graph.nodes) == 1


def test_rate_limit_becomes_a_quota_error():
    def rate_limited(messages):
        raise RuntimeError("429 POST generativelanguage: quota exceeded")

    processor = TranscriptProcessor.__new__(TranscriptProcessor)
    processor.llm = SimpleNamespace(invoke=rate_limited)

    with pytest.raises(AIQuotaError):
        asyncio.run(processor.process_transcript("x"))


def test_invalid_json_raises_processing_error():
    with pytest.raises(AIProcessingError):
        asyncio.run(processor_replying_with("not json").process_transcript("x"))


def test_empty_transcript_raises_processing_error():
    with pytest.raises(AIProcessingError):
        asyncio.run(processor_replying_with(VALID_REPLY).process_transcript("  "))
