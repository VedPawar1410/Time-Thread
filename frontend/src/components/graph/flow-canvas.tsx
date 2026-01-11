"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TopicNode } from "./nodes/topic-node";
import type { NodeData } from "@/types/graph";

// Define custom node types - using 'as const' to satisfy TypeScript
const nodeTypes = {
  topic: TopicNode,
  subtopic: TopicNode,
  question: TopicNode,
  answer: TopicNode,
  insight: TopicNode,
  quote: TopicNode,
  reference: TopicNode,
} as const;

// Demo nodes for initial display
const initialNodes: Node[] = [
  {
    id: "node-1",
    type: "topic",
    position: { x: 250, y: 0 },
    data: {
      label: "Introduction",
      content: "Opening remarks and topic overview",
      timestampStart: 0,
      timestampEnd: 120,
      nodeType: "topic",
    },
  },
  {
    id: "node-2",
    type: "subtopic",
    position: { x: 100, y: 150 },
    data: {
      label: "Background Context",
      content: "Historical context and motivation behind the discussion",
      timestampStart: 120,
      timestampEnd: 300,
      nodeType: "subtopic",
    },
  },
  {
    id: "node-3",
    type: "subtopic",
    position: { x: 400, y: 150 },
    data: {
      label: "Main Discussion",
      content: "Core topics and key points explored in depth",
      timestampStart: 300,
      timestampEnd: 600,
      nodeType: "subtopic",
    },
  },
  {
    id: "node-4",
    type: "question",
    position: { x: 250, y: 300 },
    data: {
      label: "Key Question",
      content: "What are the implications of this approach?",
      timestampStart: 600,
      timestampEnd: 720,
      nodeType: "question",
    },
  },
  {
    id: "node-5",
    type: "insight",
    position: { x: 250, y: 450 },
    data: {
      label: "Conclusion",
      content: "Summary of key takeaways and final thoughts",
      timestampStart: 720,
      timestampEnd: 900,
      nodeType: "insight",
    },
  },
];

// Demo edges
const initialEdges: Edge[] = [
  { id: "edge-1", source: "node-1", target: "node-2", animated: false },
  { id: "edge-2", source: "node-1", target: "node-3", animated: false },
  { id: "edge-3", source: "node-2", target: "node-4", animated: false },
  { id: "edge-4", source: "node-3", target: "node-4", animated: false },
  { id: "edge-5", source: "node-4", target: "node-5", animated: true },
];

export function FlowCanvas(): JSX.Element {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  // MiniMap node color based on type
  const nodeColor = useCallback((node: Node) => {
    const colors: Record<string, string> = {
      topic: "hsl(47, 96%, 53%)",
      subtopic: "hsl(173, 58%, 45%)",
      question: "hsl(262, 83%, 58%)",
      answer: "hsl(142, 71%, 45%)",
      insight: "hsl(27, 87%, 67%)",
      quote: "hsl(197, 37%, 50%)",
      reference: "hsl(0, 0%, 50%)",
    };
    return colors[node.type ?? "topic"] ?? "hsl(0, 0%, 50%)";
  }, []);

  // Default edge options
  const defaultEdgeOptions = useMemo(
    () => ({
      style: {
        stroke: "hsl(240, 5%, 40%)",
        strokeWidth: 2,
      },
    }),
    []
  );

  return (
    <div className="w-full h-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(240, 5%, 20%)"
        />
        <Controls
          showZoom
          showFitView
          showInteractive
          className="bg-card border-border"
        />
        <MiniMap
          nodeColor={nodeColor}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="bg-card/80 rounded-lg"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
