"use client";

import { useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  SmoothStepEdge,
  BezierEdge,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TopicNode, type TopicNodeData } from "./nodes/topic-node";
import type { AIGraphResponse, ProcessedNode, ProcessedEdge } from "@/types/graph";
import {
  useTimelineStore,
  selectCurrentTime,
  selectActiveNodeId,
  selectFollowMode,
} from "@/stores/timeline-store";

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
// Layout Constants - Spatial Timeline Rule
// ─────────────────────────────────────────────────────────────────────────────

/** Pixels per minute for Y-axis (time) - 100px = 1 minute */
const PIXELS_PER_MINUTE = 100;

/** X-axis depth levels */
const DEPTH_LEVELS = {
  MAIN: 0,        // Main topics at x = 0
  SUBTOPIC: 200,  // Side questions/subtopics at x = 200
  TANGENT: 400,   // Sub-tangents at x = 400
} as const;

/** Minimum vertical spacing between nodes to prevent overlap */
const MIN_NODE_SPACING = 140;

/** Node width for layout calculations */
const NODE_WIDTH = 260;

// ─────────────────────────────────────────────────────────────────────────────
// Node & Edge Type Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Define custom node types - using 'as const' for TypeScript compatibility
const nodeTypes = {
  main: TopicNode,
  subtopic: TopicNode,
  tangent: TopicNode,
  topic: TopicNode,
} as const;

const edgeTypes = {
  smoothstep: SmoothStepEdge,
  default: BezierEdge,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse timestamp string (MM:SS or HH:MM:SS) to seconds
 */
export function parseTimestamp(timestamp: string): number {
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
 * Get the depth level (X position) based on node type
 */
function getDepthLevel(nodeType: string): number {
  switch (nodeType) {
    case "main":
    case "topic":
      return DEPTH_LEVELS.MAIN;
    case "subtopic":
      return DEPTH_LEVELS.SUBTOPIC;
    case "tangent":
      return DEPTH_LEVELS.TANGENT;
    default:
      return DEPTH_LEVELS.MAIN;
  }
}

/**
 * Convert backend ProcessedNode to React Flow Node
 * Uses Spatial Timeline Rule: Y = time, X = depth
 */
function convertToFlowNode(
  node: ProcessedNode,
  index: number,
  allNodes: ProcessedNode[],
  nodePositions: Map<string, { x: number; y: number }>
): Node {
  const startSeconds = parseTimestamp(node.start_time);
  const startMinutes = startSeconds / 60;

  // Y position based on time (100px per minute)
  let yPosition = startMinutes * PIXELS_PER_MINUTE;

  // X position based on depth (type)
  const xPosition = getDepthLevel(node.type);

  // Ensure minimum spacing from nodes at the same depth level
  const nodesAtSameDepth = allNodes
    .slice(0, index)
    .filter((n) => getDepthLevel(n.type) === xPosition);

  if (nodesAtSameDepth.length > 0) {
    const lastNodeAtDepth = nodesAtSameDepth[nodesAtSameDepth.length - 1];
    const lastPosition = nodePositions.get(lastNodeAtDepth.id);
    if (lastPosition && yPosition < lastPosition.y + MIN_NODE_SPACING) {
      yPosition = lastPosition.y + MIN_NODE_SPACING;
    }
  }

  // Store position for subsequent calculations
  nodePositions.set(node.id, { x: xPosition, y: yPosition });

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
      timestampSeconds: startSeconds,
    },
  };
}

/**
 * Convert backend ProcessedEdge to React Flow Edge
 */
function convertToFlowEdge(edge: ProcessedEdge, nodes: ProcessedNode[]): Edge {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const isTangentEdge =
    sourceNode?.type === "tangent" ||
    targetNode?.type === "tangent" ||
    edge.label === "tangent" ||
    edge.label === "interruption";

  const isReturnEdge = edge.label === "return_to_topic";

  return {
    id: `edge-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: isTangentEdge || isReturnEdge ? "default" : "smoothstep",
    animated: isTangentEdge,
    style: {
      stroke: isTangentEdge
        ? "rgba(217, 70, 239, 0.6)"
        : isReturnEdge
        ? "rgba(156, 163, 175, 0.5)"
        : "rgba(251, 191, 36, 0.5)",
      strokeWidth: isTangentEdge ? 2 : 2.5,
      strokeDasharray: isReturnEdge ? "5,5" : undefined,
    },
    label: isReturnEdge ? "↩ return" : undefined,
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

/**
 * Find which node corresponds to the current playback time
 */
function findActiveNodeByTime(
  nodes: Node[],
  currentTimeSeconds: number
): string | null {
  // Find the node whose time range contains the current time
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const data = node.data as TopicNodeData;
    if (data.timestampSeconds !== undefined) {
      if (data.timestampSeconds <= currentTimeSeconds) {
        return node.id;
      }
    }
  }
  return nodes.length > 0 ? nodes[0].id : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner Component (needs ReactFlow context)
// ─────────────────────────────────────────────────────────────────────────────

function TimelineCanvasInner({
  graphData,
  onSeekTo,
  className,
}: TimelineCanvasProps): JSX.Element {
  const { setCenter, getNode } = useReactFlow();

  // Zustand store
  const currentTime = useTimelineStore(selectCurrentTime);
  const activeNodeId = useTimelineStore(selectActiveNodeId);
  const followMode = useTimelineStore(selectFollowMode);
  const setActiveNodeId = useTimelineStore((s) => s.setActiveNodeId);

  // Track last centered node to avoid redundant pans
  const lastCenteredNodeRef = useRef<string | null>(null);

  // Convert graph data to React Flow format
  const { initialNodes, initialEdges } = useMemo(() => {
    const sortedNodes = [...graphData.nodes].sort((a, b) => {
      return parseTimestamp(a.start_time) - parseTimestamp(b.start_time);
    });

    const nodePositions = new Map<string, { x: number; y: number }>();

    const flowNodes = sortedNodes.map((node, index) =>
      convertToFlowNode(node, index, sortedNodes, nodePositions)
    );

    const flowEdges = graphData.edges.map((edge) =>
      convertToFlowEdge(edge, graphData.nodes)
    );

    return { initialNodes: flowNodes, initialEdges: flowEdges };
  }, [graphData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Update active node based on current time
  useEffect(() => {
    const newActiveId = findActiveNodeByTime(nodes, currentTime);
    if (newActiveId && newActiveId !== activeNodeId) {
      setActiveNodeId(newActiveId);
    }
  }, [currentTime, nodes, activeNodeId, setActiveNodeId]);

  // Auto-center on active node (Follow Mode)
  useEffect(() => {
    if (!followMode || !activeNodeId) return;
    if (lastCenteredNodeRef.current === activeNodeId) return;

    const node = getNode(activeNodeId);
    if (node) {
      const x = node.position.x + NODE_WIDTH / 2;
      const y = node.position.y + 70; // Center on node middle

      setCenter(x, y, { zoom: 1, duration: 600 });
      lastCenteredNodeRef.current = activeNodeId;
    }
  }, [activeNodeId, followMode, setCenter, getNode]);

  // Update node selection state based on activeNodeId
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === activeNodeId,
      }))
    );
  }, [activeNodeId, setNodes]);

  // Handle node click
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setActiveNodeId(node.id);
      const data = node.data as TopicNodeData;
      if (onSeekTo && data.startTime) {
        const seconds = parseTimestamp(data.startTime);
        onSeekTo(seconds);
      }
    },
    [onSeekTo, setActiveNodeId]
  );

  // MiniMap node colors
  const getNodeColor = useCallback((node: Node) => {
    const colors: Record<string, string> = {
      main: "#fbbf24",
      subtopic: "#34d399",
      tangent: "#d946ef",
      topic: "#fbbf24",
    };
    return colors[node.type ?? "main"] ?? "#fbbf24";
  }, []);

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
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="rgba(255, 255, 255, 0.08)"
        />

        <Controls
          showZoom
          showFitView
          showInteractive={false}
          className="!bg-black/40 !backdrop-blur-xl !border !border-white/10 !rounded-xl !shadow-2xl"
        />

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
// Exported Component (with ReactFlowProvider wrapper)
// ─────────────────────────────────────────────────────────────────────────────

export function TimelineCanvas(props: TimelineCanvasProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <TimelineCanvasInner {...props} />
    </ReactFlowProvider>
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
      summary:
        "Welcome and overview of today's discussion on AI development. We'll be covering the history, current state, and future of artificial intelligence.",
    },
    {
      id: "2",
      label: "AI History",
      type: "main",
      start_time: "02:30",
      end_time: "08:15",
      speaker: "Guest",
      summary:
        "Brief history of artificial intelligence from the 1950s to present day. The Dartmouth Conference, expert systems era, and the AI winters.",
    },
    {
      id: "3",
      label: "Turing Test Debate",
      type: "tangent",
      start_time: "05:20",
      end_time: "06:45",
      speaker: "Host",
      summary:
        "Side discussion about whether the Turing Test is still relevant today. Some argue it's outdated, others say it's still the gold standard.",
    },
    {
      id: "4",
      label: "Modern LLMs",
      type: "main",
      start_time: "08:15",
      end_time: "15:00",
      speaker: "Guest",
      summary:
        "Deep dive into large language models and transformer architecture. Attention mechanisms, scaling laws, and emergent capabilities.",
    },
    {
      id: "5",
      label: "Training Costs",
      type: "subtopic",
      start_time: "10:30",
      end_time: "12:00",
      speaker: "Guest",
      summary:
        "Discussion about the environmental and financial costs of training LLMs. GPT-4 reportedly cost over $100M to train.",
    },
    {
      id: "6",
      label: "Personal Anecdote",
      type: "tangent",
      start_time: "13:00",
      end_time: "14:00",
      speaker: "Host",
      summary:
        "Host shares a funny story about their first interaction with ChatGPT and how it hallucinated their biography.",
    },
    {
      id: "7",
      label: "Future Predictions",
      type: "main",
      start_time: "15:00",
      end_time: "20:00",
      speaker: "Guest",
      summary:
        "Predictions for AI development over the next decade. AGI timelines, regulatory challenges, and societal impacts.",
    },
    {
      id: "8",
      label: "Closing Thoughts",
      type: "main",
      start_time: "20:00",
      end_time: "22:00",
      speaker: "Host",
      summary:
        "Summary of key takeaways and farewell to the audience. Links to resources mentioned in the discussion.",
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
