"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  MessageCircle,
  HelpCircle,
  Lightbulb,
  Quote,
  Link2,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils";
import type { NodeData, NodeType } from "@/types/graph";

// Icon mapping for node types
const nodeIcons: Record<NodeType, React.ReactNode> = {
  topic: <BookOpen className="h-4 w-4" />,
  subtopic: <MessageCircle className="h-4 w-4" />,
  question: <HelpCircle className="h-4 w-4" />,
  answer: <MessageCircle className="h-4 w-4" />,
  insight: <Lightbulb className="h-4 w-4" />,
  quote: <Quote className="h-4 w-4" />,
  reference: <Link2 className="h-4 w-4" />,
};

// Color classes for node types
const nodeColorClasses: Record<NodeType, string> = {
  topic: "border-node-topic bg-node-topic/10 text-node-topic",
  subtopic: "border-node-subtopic bg-node-subtopic/10 text-node-subtopic",
  question: "border-node-question bg-node-question/10 text-node-question",
  answer: "border-node-answer bg-node-answer/10 text-node-answer",
  insight: "border-node-insight bg-node-insight/10 text-node-insight",
  quote: "border-muted bg-muted/10 text-muted-foreground",
  reference: "border-muted bg-muted/10 text-muted-foreground",
};

function TopicNodeComponent({ data, selected }: NodeProps<NodeData>): JSX.Element {
  const nodeType = data.nodeType ?? "topic";
  const icon = nodeIcons[nodeType];
  const colorClass = nodeColorClasses[nodeType];

  return (
    <>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />

      {/* Node Content */}
      <div
        className={cn(
          "min-w-[180px] max-w-[280px] rounded-lg border-2 shadow-lg transition-all duration-200",
          colorClass,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-current/20">
          <div className="flex-shrink-0">{icon}</div>
          <span className="font-medium text-sm truncate">{data.label}</span>
        </div>

        {/* Content */}
        <div className="px-3 py-2">
          <p className="text-xs text-foreground/80 line-clamp-2">
            {data.content}
          </p>

          {/* Timestamp */}
          {data.timestampStart !== undefined && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>{formatTimestamp(data.timestampStart)}</span>
              {data.timestampEnd !== undefined && (
                <>
                  <span>-</span>
                  <span>{formatTimestamp(data.timestampEnd)}</span>
                </>
              )}
            </div>
          )}

          {/* Speaker */}
          {data.speaker && (
            <div className="mt-1 text-[10px] text-muted-foreground">
              Speaker: {data.speaker}
            </div>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
    </>
  );
}

export const TopicNode = memo(TopicNodeComponent);
