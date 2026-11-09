"""Saved maps API, with Supabase replaced by an in-memory fake."""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import maps as maps_endpoint
from app.main import app

TIMESTAMP = "2026-01-01T00:00:00+00:00"
MISSING_ID = "00000000-0000-0000-0000-000000000000"
NEW_MAP = {
    "name": "My map",
    "video_id": "dQw4w9WgXcQ",
    "graph_data": {
        "nodes": [
            {
                "id": "node-1",
                "label": "Intro",
                "type": "main",
                "start_time": "00:00",
                "end_time": "00:30",
                "summary": "Start",
            }
        ],
        "edges": [],
    },
}


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows
        self.operation = "select"
        self.payload = None
        self.id_filter = None

    def select(self, *args):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, count):
        return self

    def eq(self, column, value):
        self.id_filter = value
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = payload
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def execute(self):
        if self.operation == "insert":
            row = {
                "description": None,
                "video_url": None,
                "raw_transcript": None,
                **self.payload,
                "id": str(uuid4()),
                "created_at": TIMESTAMP,
                "updated_at": TIMESTAMP,
            }
            self.rows.append(row)
            return SimpleNamespace(data=[row])

        matched = [
            row
            for row in self.rows
            if self.id_filter is None or row["id"] == self.id_filter
        ]

        if self.operation == "update":
            for row in matched:
                row.update(self.payload)
        elif self.operation == "delete":
            for row in matched:
                self.rows.remove(row)

        return SimpleNamespace(data=matched)


class FakeClient:
    def __init__(self):
        self.rows = []

    def table(self, name):
        return FakeQuery(self.rows)


@pytest.fixture
def client(monkeypatch):
    fake = FakeClient()
    monkeypatch.setattr(maps_endpoint, "get_supabase", lambda: fake)
    return TestClient(app)


def create_map(client):
    response = client.post("/api/v1/maps/", json=NEW_MAP)
    assert response.status_code == 201
    return response.json()["data"]["id"]


def test_created_map_can_be_read_and_listed(client):
    map_id = create_map(client)

    fetched = client.get(f"/api/v1/maps/{map_id}")
    recent = client.get("/api/v1/maps/recent")

    assert fetched.status_code == 200
    assert fetched.json()["data"]["graph_data"]["nodes"][0]["id"] == "node-1"
    assert [item["id"] for item in recent.json()["maps"]] == [map_id]


def test_update_changes_the_map(client):
    map_id = create_map(client)

    response = client.put(f"/api/v1/maps/{map_id}", json={"name": "Renamed"})

    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Renamed"


def test_update_with_no_fields_returns_400(client):
    assert client.put(f"/api/v1/maps/{MISSING_ID}", json={}).status_code == 400


def test_delete_removes_the_map(client):
    map_id = create_map(client)

    assert client.delete(f"/api/v1/maps/{map_id}").status_code == 200
    assert client.get(f"/api/v1/maps/{map_id}").status_code == 404
    assert client.delete(f"/api/v1/maps/{map_id}").status_code == 404


@pytest.mark.parametrize(
    "method, kwargs",
    [
        ("get", {}),
        ("put", {"json": {"name": "x"}}),
        ("delete", {}),
    ],
)
def test_missing_map_returns_404(client, method, kwargs):
    response = getattr(client, method)(f"/api/v1/maps/{MISSING_ID}", **kwargs)

    assert response.status_code == 404


@pytest.mark.parametrize(
    "method, path, kwargs",
    [
        ("post", "/api/v1/maps/", {"json": NEW_MAP}),
        ("put", f"/api/v1/maps/{MISSING_ID}", {"json": {"name": "x"}}),
        ("delete", f"/api/v1/maps/{MISSING_ID}", {}),
    ],
)
def test_read_only_mode_blocks_changes(client, monkeypatch, method, path, kwargs):
    monkeypatch.setattr(
        maps_endpoint,
        "get_settings",
        lambda: SimpleNamespace(read_only_maps=True),
    )

    assert getattr(client, method)(path, **kwargs).status_code == 403
    assert client.get("/api/v1/maps/recent").status_code == 200


def test_malformed_id_returns_422(client):
    assert client.get("/api/v1/maps/not-a-uuid").status_code == 422


def test_unconfigured_database_returns_503(monkeypatch):
    monkeypatch.setattr(
        maps_endpoint,
        "get_settings",
        lambda: SimpleNamespace(supabase_url="", supabase_service_role_key=""),
    )

    assert TestClient(app).get("/api/v1/maps/").status_code == 503


def test_database_failure_returns_500_without_details(monkeypatch):
    class BrokenClient:
        def table(self, name):
            raise RuntimeError("secret connection detail")

    monkeypatch.setattr(maps_endpoint, "get_supabase", lambda: BrokenClient())

    response = TestClient(app).get("/api/v1/maps/")

    assert response.status_code == 500
    assert "secret" not in response.json()["detail"]
