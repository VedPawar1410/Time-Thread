import type { ProcessTranscriptResponse, AIGraphResponse } from "@/types/graph";

/**
 * Base API URL - uses environment variable in production
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

  /**
   * Analyze raw transcript text
   */
  async analyzeTranscript(transcript: string): Promise<AIGraphResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transcript),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail ?? `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      throw new Error(`API health check failed: HTTP ${response.status}`);
    }

    return response.json();
  },
};
