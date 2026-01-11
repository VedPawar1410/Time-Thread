"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { User, Clock, GitBranch, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeType } from "@/types/graph";

/** Data structure for TopicNode */
export interface TopicNodeData {
  label: string;
  summary: string;
  speaker: string | null;
  startTime: string; // MM:SS format
  endTime?: string;
  nodeType: NodeType;
}

/** Icon mapping for node types */
const nodeIcons: Record<string, React.ReactNode> = {
  main: <MessageSquare className="h-3.5 w-3.5" />,
  subtopic: <GitBranch className="h-3.5 w-3.5" />,
  tangent: <Zap className="h-3.5 w-3.5" />,
  topic: <MessageSquare className="h-3.5 w-3.5" />,
};

/** Border colors for different node types - tangents get a distinct accent */
const nodeBorderColors: Record<string, string> = {
  main: "border-amber-400/60",
  subtopic: "border-emerald-400/60",
  tangent: "border-fuchsia-400/70",
  topic: "border-amber-400/60",
};

/** Glow colors for hover states */
const nodeGlowColors: Record<string, string> = {
  main: "hover:shadow-amber-500/20",
  subtopic: "hover:shadow-emerald-500/20",
  tangent: "hover:shadow-fuchsia-500/30",
  topic: "hover:shadow-amber-500/20",
};

/** Accent dot colors */
const nodeAccentColors: Record<string, string> = {
  main: "bg-amber-400",
  subtopic: "bg-emerald-400",
  tangent: "bg-fuchsia-400",
  topic: "bg-amber-400",
};

function TopicNodeComponent({
  data,
  selected,
}: NodeProps<TopicNodeData>): JSX.Element {
  const nodeType = data.nodeType ?? "main";
  const icon = nodeIcons[nodeType] ?? nodeIcons.main;
  const borderColor = nodeBorderColors[nodeType] ?? nodeBorderColors.main;
  const glowColor = nodeGlowColors[nodeType] ?? nodeGlowColors.main;
  const accentColor = nodeAccentColors[nodeType] ?? nodeAccentColors.main;
  const isTangent = nodeType === "tangent";

  return (
    <>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-2.5 !h-2.5 !border-2 !border-background/80",
          isTangent ? "!bg-fuchsia-400" : "!bg-amber-400"
        )}
      />

      {/* Node Container - Glassmorphism */}
      <div
        className={cn(
          // Base glassmorphism
          "relative min-w-[220px] max-w-[280px]",
          "rounded-xl border backdrop-blur-xl",
          "bg-white/[0.03] dark:bg-white/[0.03]",
          "shadow-xl transition-all duration-300 ease-out",
          // Border color based on type
          borderColor,
          // Hover glow effect
          glowColor,
          "hover:shadow-2xl hover:scale-[1.02]",
          // Selection state
          selected && [
            "ring-2 ring-offset-2 ring-offset-background/50",
            isTangent ? "ring-fuchsia-400/80" : "ring-amber-400/80",
          ],
          // Tangent special styling
          isTangent && "border-dashed"
        )}
      >
        {/* Top accent line */}
        <div
          className={cn(
            "absolute top-0 left-4 right-4 h-[1px]",
            "bg-gradient-to-r from-transparent via-white/20 to-transparent"
          )}
        />

        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2.5 px-4 py-3",
            "border-b border-white/[0.06]"
          )}
        >
          {/* Type indicator dot */}
          <div
            className={cn(
              "flex-shrink-0 w-2 h-2 rounded-full",
              accentColor,
              "shadow-sm",
              isTangent && "animate-pulse"
            )}
          />

          {/* Icon */}
          <div className="flex-shrink-0 text-white/60">{icon}</div>

          {/* Label */}
          <span className="font-semibold text-sm text-white/90 truncate flex-1">
            {data.label}
          </span>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-2.5">
          {/* Summary */}
          <p className="text-xs text-white/70 leading-relaxed line-clamp-3">
            {data.summary}
          </p>

          {/* Meta row: Speaker & Timestamp */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {/* Speaker */}
            {data.speaker && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                <User className="h-3 w-3" />
                <span className="font-medium text-white/70">{data.speaker}</span>
              </div>
            )}

            {/* Timestamp */}
            <div
              className={cn(
                "flex items-center gap-1.5 text-[11px] ml-auto",
                "px-2 py-0.5 rounded-full",
                "bg-white/[0.05] border border-white/[0.08]",
                isTangent ? "text-fuchsia-300/80" : "text-amber-300/80"
              )}
            >
              <Clock className="h-3 w-3" />
              <span className="font-mono font-medium">{data.startTime}</span>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-8 rounded-b-xl",
            "bg-gradient-to-t from-black/20 to-transparent",
            "pointer-events-none"
          )}
        />
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-2.5 !h-2.5 !border-2 !border-background/80",
          isTangent ? "!bg-fuchsia-400" : "!bg-amber-400"
        )}
      />
    </>
  );
}

export const TopicNode = memo(TopicNodeComponent);
