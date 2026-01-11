import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AIGraphResponse } from "@/types/graph";

/**
 * Database types for the Time-Thread application.
 * These map to the Supabase `maps` table.
 */
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

export interface MapInsert {
  name: string;
  description?: string;
  video_id?: string;
  video_url?: string;
  graph_data: AIGraphResponse;
  raw_transcript?: string;
}

// Singleton client instance
let supabase: SupabaseClient | null = null;

/**
 * Get the Supabase client instance.
 * Creates a new client if one doesn't exist.
 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (supabase) {
    return supabase;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn("Supabase credentials not configured");
    return null;
  }

  supabase = createClient(url, anonKey);
  return supabase;
}

/**
 * Maps API - CRUD operations for saved graphs
 */
export const mapsApi = {
  /**
   * Get all maps, ordered by most recent first
   */
  async getAll(): Promise<MapRecord[]> {
    const client = getSupabase();
    if (!client) return [];

    const { data, error } = await client
      .from("maps")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching maps:", error);
      return [];
    }

    return data ?? [];
  },

  /**
   * Get a single map by ID
   */
  async getById(id: string): Promise<MapRecord | null> {
    const client = getSupabase();
    if (!client) return null;

    const { data, error } = await client
      .from("maps")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching map:", error);
      return null;
    }

    return data;
  },

  /**
   * Get recent maps (for sidebar) - returns minimal data
   */
  async getRecent(limit: number = 5): Promise<Pick<MapRecord, "id" | "name" | "updated_at">[]> {
    const client = getSupabase();
    if (!client) return [];

    const { data, error } = await client
      .from("maps")
      .select("id, name, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent maps:", error);
      return [];
    }

    return data ?? [];
  },

  /**
   * Create a new map
   */
  async create(map: MapInsert): Promise<MapRecord | null> {
    const client = getSupabase();
    if (!client) return null;

    const { data, error } = await client
      .from("maps")
      .insert({
        ...map,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating map:", error);
      return null;
    }

    return data;
  },

  /**
   * Update an existing map
   */
  async update(
    id: string,
    updates: Partial<MapInsert>
  ): Promise<MapRecord | null> {
    const client = getSupabase();
    if (!client) return null;

    const { data, error } = await client
      .from("maps")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating map:", error);
      return null;
    }

    return data;
  },

  /**
   * Delete a map
   */
  async delete(id: string): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    const { error } = await client.from("maps").delete().eq("id", id);

    if (error) {
      console.error("Error deleting map:", error);
      return false;
    }

    return true;
  },
};
