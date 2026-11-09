/**
 * Graph types for React Flow visualization.
 * These types mirror the backend Pydantic models for type safety.
 */

import type { Node, Edge } from "@xyflow/react";

/** Types of nodes in the conversation graph */
export type NodeType =
  | "main"
  | "subtopic"
  | "tangent"
  | "topic"
  | "question"
  | "answer"
  | "insight"
  | "quote"
  | "reference";

/** Types of edges connecting nodes */
export type EdgeType =
  | "follows"
  | "branches_to"
  | "references"
  | "responds_to"
  | "contains"
  | "interruption"
  | "return_to_topic"
  | "tangent";

/** Source types for transcription */
export type SourceType = "youtube" | "pdf" | "audio" | "text";

/** Data payload for a node - index signature for React Flow v12 compatibility */
export interface NodeData extends Record<string, unknown> {
  label: string;
  content: string;
  timestampStart?: number;
  timestampEnd?: number;
  speaker?: string;
  nodeType: NodeType;
  metadata?: Record<string, unknown>;
}

/** Custom node type for React Flow */
export type TimeThreadNode = Node<NodeData, NodeType>;

/** Custom edge type for React Flow */
export interface TimeThreadEdge extends Edge {
  type?: EdgeType;
  animated?: boolean;
  label?: string;
}

/** Complete graph structure */
export interface Graph {
  id: string;
  name: string;
  description: string;
  nodes: TimeThreadNode[];
  edges: TimeThreadEdge[];
  sourceType?: SourceType;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

/** Graph creation payload */
export interface GraphCreate {
  name: string;
  description?: string;
  sourceType?: SourceType;
  sourceUrl?: string;
}

/** Transcription request */
export interface TranscriptionRequest {
  source: string;
  sourceType: SourceType;
}

/** Transcript segment with timing */
export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  speaker?: string;
}

/** Transcription result */
export interface TranscriptionResult {
  sourceType: SourceType;
  sourceIdentifier: string;
  segments: TranscriptSegment[];
  fullText: string;
  metadata: Record<string, unknown>;
  duration?: number;
}

// --- AI Processing Types (matches backend Pydantic models) ---

/** A node extracted by AI from transcript analysis */
export interface ProcessedNode {
  id: string;
  label: string;
  type: "main" | "subtopic" | "tangent";
  start_time: string; // Format: 'MM:SS' or 'HH:MM:SS'
  end_time: string;
  speaker: string | null;
  summary: string;
}

/** An edge/relationship extracted by AI from transcript analysis */
export interface ProcessedEdge {
  source: string;
  target: string;
  label: "follows" | "interruption" | "return_to_topic" | "branches_to" | "tangent";
}

/** Structured response from AI transcript processing */
export interface AIGraphResponse {
  nodes: ProcessedNode[];
  edges: ProcessedEdge[];
}

/** Response schema for transcript processing */
export interface ProcessTranscriptResponse {
  success: boolean;
  message: string;
  warning: string | null;
  map_id: string | null;
  video_id: string | null;
  title: string | null;
  graph: AIGraphResponse | null;
  raw_transcript: string | null;
}
