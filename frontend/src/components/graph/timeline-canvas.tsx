"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  SmoothStepEdge,
  BezierEdge,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TopicNode, type TopicNodeData } from "./nodes/topic-node";
import type { AIGraphResponse, ProcessedNode, ProcessedEdge } from "@/types/graph";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineCanvasProps {
  /** Graph data from the backend AI processing */
  graphData: AIGraphResponse;
  /** Callback when a node is clicked - receives timestamp in seconds */
  onSeekTo?: (timestamp: number) => void;
  /** Optional className for the container */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Pixels per second for vertical timeline spacing */
const PIXELS_PER_SECOND = 3;

/** Base X position for main timeline nodes */
const MAIN_TIMELINE_X = 400;

/** X offset for tangent nodes (branching effect) */
const TANGENT_X_OFFSET = 320;

/** Minimum vertical spacing between nodes */
const MIN_NODE_SPACING = 120;

// ─────────────────────────────────────────────────────────────────────────────
// Node & Edge Type Configuration
// ─────────────────────────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  main: TopicNode,
  subtopic: TopicNode,
  tangent: TopicNode,
  topic: TopicNode,
};

const edgeTypes: EdgeTypes = {
  smoothstep: SmoothStepEdge,
  default: BezierEdge,
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse timestamp string (MM:SS or HH:MM:SS) to seconds
 */
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(":").map(Number);
  
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }
  
  return 0;
}

/**
 * Convert backend ProcessedNode to React Flow Node
 */
function convertToFlowNode(
  node: ProcessedNode,
  index: number,
  allNodes: ProcessedNode[]
): Node<TopicNodeData> {
  const startSeconds = parseTimestamp(node.start_time);
  const isTangent = node.type === "tangent";
  
  // Calculate Y position based on timestamp
  // Add minimum spacing to prevent overlap
  let yPosition = startSeconds * PIXELS_PER_SECOND;
  
  // Find previous node to ensure minimum spacing
  const prevNodes = allNodes.slice(0, index);
  if (prevNodes.length > 0) {
    const prevNode = prevNodes[prevNodes.length - 1];
    const prevY = parseTimestamp(prevNode.start_time) * PIXELS_PER_SECOND;
    const prevHeight = 140; // Estimated node height
    
    if (yPosition < prevY + prevHeight + MIN_NODE_SPACING) {
      yPosition = prevY + prevHeight + MIN_NODE_SPACING;
    }
  }
  
  // X position: offset tangents to the right for branching effect
  let xPosition = MAIN_TIMELINE_X;
  if (isTangent) {
    // Alternate tangents slightly for visual variety
    const tangentOffset = index % 2 === 0 ? TANGENT_X_OFFSET : TANGENT_X_OFFSET + 40;
    xPosition = MAIN_TIMELINE_X + tangentOffset;
  } else if (node.type === "subtopic") {
    // Subtopics slightly offset to the left
    xPosition = MAIN_TIMELINE_X - 60;
  }

  return {
    id: node.id,
    type: node.type,
    position: { x: xPosition, y: yPosition },
    data: {
      label: node.label,
      summary: node.summary,
      speaker: node.speaker,
      startTime: node.start_time,
      endTime: node.end_time,
      nodeType: node.type,
    },
  };
}

/**
 * Convert backend ProcessedEdge to React Flow Edge
 */
function convertToFlowEdge(
  edge: ProcessedEdge,
  nodes: ProcessedNode[]
): Edge {
  // Determine if this edge connects to/from a tangent
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const isTangentEdge =
    sourceNode?.type === "tangent" ||
    targetNode?.type === "tangent" ||
    edge.label === "tangent" ||
    edge.label === "interruption";

  return {
    id: `edge-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: isTangentEdge ? "default" : "smoothstep", // Bezier for tangents, SmoothStep for main
    animated: isTangentEdge,
    style: {
      stroke: isTangentEdge
        ? "rgba(217, 70, 239, 0.6)" // Fuchsia for tangents
        : "rgba(251, 191, 36, 0.5)", // Amber for main path
      strokeWidth: isTangentEdge ? 2 : 2.5,
      strokeDasharray: edge.label === "return_to_topic" ? "5,5" : undefined,
    },
    label: edge.label === "return_to_topic" ? "↩ return" : undefined,
    labelStyle: {
      fill: "rgba(255, 255, 255, 0.6)",
      fontSize: 10,
      fontWeight: 500,
    },
    labelBgStyle: {
      fill: "rgba(0, 0, 0, 0.6)",
      fillOpacity: 0.8,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TimelineCanvas({
  graphData,
  onSeekTo,
  className,
}: TimelineCanvasProps): JSX.Element {
  // Convert graph data to React Flow format
  const { initialNodes, initialEdges } = useMemo(() => {
    const sortedNodes = [...graphData.nodes].sort((a, b) => {
      return parseTimestamp(a.start_time) - parseTimestamp(b.start_time);
    });

    const flowNodes = sortedNodes.map((node, index) =>
      convertToFlowNode(node, index, sortedNodes)
    );

    const flowEdges = graphData.edges.map((edge) =>
      convertToFlowEdge(edge, graphData.nodes)
    );

    return { initialNodes: flowNodes, initialEdges: flowEdges };
  }, [graphData]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Handle node click - extract timestamp and call seekTo
  const handleNodeClick: NodeMouseHandler<Node<TopicNodeData>> = useCallback(
    (_, node) => {
      if (onSeekTo && node.data.startTime) {
        const seconds = parseTimestamp(node.data.startTime);
        onSeekTo(seconds);
      }
    },
    [onSeekTo]
  );

  // MiniMap node colors
  const getNodeColor = useCallback((node: Node<TopicNodeData>) => {
    const colors: Record<string, string> = {
      main: "#fbbf24", // Amber
      subtopic: "#34d399", // Emerald
      tangent: "#d946ef", // Fuchsia
      topic: "#fbbf24",
    };
    return colors[node.type ?? "main"] ?? "#fbbf24";
  }, []);

  // Default edge options
  const defaultEdgeOptions = useMemo(
    () => ({
      style: {
        stroke: "rgba(251, 191, 36, 0.4)",
        strokeWidth: 2,
      },
    }),
    []
  );

  return (
    <div className={className ?? "w-full h-full bg-background"}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        // Prevent accidental connections
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        {/* Dotted pattern background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="rgba(255, 255, 255, 0.08)"
        />

        {/* Zoom/Pan controls */}
        <Controls
          showZoom
          showFitView
          showInteractive={false}
          className="!bg-black/40 !backdrop-blur-xl !border !border-white/10 !rounded-xl !shadow-2xl"
        />

        {/* Mini map for navigation */}
        <MiniMap
          nodeColor={getNodeColor}
          maskColor="rgba(0, 0, 0, 0.85)"
          className="!bg-black/40 !backdrop-blur-xl !rounded-xl !border !border-white/10"
          pannable
          zoomable
          nodeStrokeWidth={3}
        />
      </ReactFlow>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo Data for Testing
// ─────────────────────────────────────────────────────────────────────────────

export const demoGraphData: AIGraphResponse = {
  nodes: [
    {
      id: "1",
      label: "Introduction",
      type: "main",
      start_time: "00:00",
      end_time: "02:30",
      speaker: "Host",
      summary: "Welcome and overview of today's discussion on AI development.",
    },
    {
      id: "2",
      label: "AI History",
      type: "main",
      start_time: "02:30",
      end_time: "08:15",
      speaker: "Guest",
      summary: "Brief history of artificial intelligence from the 1950s to present day.",
    },
    {
      id: "3",
      label: "Turing Test Debate",
      type: "tangent",
      start_time: "05:20",
      end_time: "06:45",
      speaker: "Host",
      summary: "Side discussion about whether the Turing Test is still relevant today.",
    },
    {
      id: "4",
      label: "Modern LLMs",
      type: "main",
      start_time: "08:15",
      end_time: "15:00",
      speaker: "Guest",
      summary: "Deep dive into large language models and transformer architecture.",
    },
    {
      id: "5",
      label: "Training Costs",
      type: "subtopic",
      start_time: "10:30",
      end_time: "12:00",
      speaker: "Guest",
      summary: "Discussion about the environmental and financial costs of training LLMs.",
    },
    {
      id: "6",
      label: "Personal Anecdote",
      type: "tangent",
      start_time: "13:00",
      end_time: "14:00",
      speaker: "Host",
      summary: "Host shares a funny story about their first interaction with ChatGPT.",
    },
    {
      id: "7",
      label: "Future Predictions",
      type: "main",
      start_time: "15:00",
      end_time: "20:00",
      speaker: "Guest",
      summary: "Predictions for AI development over the next decade.",
    },
    {
      id: "8",
      label: "Closing Thoughts",
      type: "main",
      start_time: "20:00",
      end_time: "22:00",
      speaker: "Host",
      summary: "Summary and farewell to the audience.",
    },
  ],
  edges: [
    { source: "1", target: "2", label: "follows" },
    { source: "2", target: "3", label: "tangent" },
    { source: "3", target: "2", label: "return_to_topic" },
    { source: "2", target: "4", label: "follows" },
    { source: "4", target: "5", label: "branches_to" },
    { source: "5", target: "4", label: "return_to_topic" },
    { source: "4", target: "6", label: "interruption" },
    { source: "6", target: "4", label: "return_to_topic" },
    { source: "4", target: "7", label: "follows" },
    { source: "7", target: "8", label: "follows" },
  ],
};
