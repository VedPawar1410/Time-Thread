/**
 * Graph types for React Flow visualization.
 * These types mirror the backend Pydantic models for type safety.
 */

import type { Node, Edge } from "@xyflow/react";

/** Types of nodes in the conversation graph */
export type NodeType =
  | "topic"
  | "subtopic"
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
  | "contains";

/** Source types for transcription */
export type SourceType = "youtube" | "pdf" | "audio" | "text";

/** Data payload for a node */
export interface NodeData {
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
