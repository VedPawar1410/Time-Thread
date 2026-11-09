import type { ProcessTranscriptResponse, AIGraphResponse } from "@/types/graph";

/**
 * Base API URL - uses environment variable in production
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface MapRecord {
  id: string;
  name: string;
  description: string | null;
  video_id: string | null;
  video_url: string | null;
  graph_data: AIGraphResponse;
  raw_transcript: string | null;
  created_at: string;
  updated_at: string;
}

export type MapSummary = Pick<MapRecord, "id" | "name" | "updated_at">;

async function mapsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/v1/maps${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      typeof error.detail === "string" ? error.detail : `HTTP ${response.status}`
    );
  }

  return response.json();
}

/**
 * Saved maps. These go through the backend, which holds the database key.
 */
export const mapsApi = {
  async getById(id: string): Promise<MapRecord> {
    const result = await mapsRequest<{ data: MapRecord }>(`/${id}`);
    return result.data;
  },

  async getRecent(limit: number = 10): Promise<MapSummary[]> {
    const result = await mapsRequest<{ maps: MapSummary[] }>(
      `/recent?limit=${limit}`
    );
    return result.maps;
  },

  async rename(id: string, name: string): Promise<MapRecord> {
    const result = await mapsRequest<{ data: MapRecord }>(`/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
    return result.data;
  },

  async delete(id: string): Promise<void> {
    await mapsRequest(`/${id}`, { method: "DELETE" });
  },
};

/**
 * API client for the Time-Thread backend
 */
export const api = {
  /**
   * Process a YouTube video transcript into a graph
   */
  async processTranscript(youtubeUrl: string): Promise<ProcessTranscriptResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/process-transcript`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ youtube_url: youtubeUrl }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail ?? `HTTP ${response.status}`);
    }

    return response.json();
  },
};
