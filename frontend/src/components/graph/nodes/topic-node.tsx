"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { User, Clock, GitBranch, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NodeType } from "@/types/graph";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Data structure for TopicNode - extends Record for React Flow v12 compatibility */
export interface TopicNodeData extends Record<string, unknown> {
  label: string;
  summary: string;
  speaker: string | null;
  startTime: string; // MM:SS format
  endTime?: string;
  nodeType: NodeType;
  /** Timestamp in seconds for time-based lookups */
  timestampSeconds?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Style Mappings
// ─────────────────────────────────────────────────────────────────────────────

const nodeIcons: Record<string, React.ReactNode> = {
  main: <MessageSquare className="h-3.5 w-3.5" />,
  subtopic: <GitBranch className="h-3.5 w-3.5" />,
  tangent: <Zap className="h-3.5 w-3.5" />,
  topic: <MessageSquare className="h-3.5 w-3.5" />,
};

const nodeBorderColors: Record<string, string> = {
  main: "border-amber-400/60",
  subtopic: "border-emerald-400/60",
  tangent: "border-fuchsia-400/70",
  topic: "border-amber-400/60",
};

const nodeGlowColors: Record<string, string> = {
  main: "hover:shadow-amber-500/20",
  subtopic: "hover:shadow-emerald-500/20",
  tangent: "hover:shadow-fuchsia-500/30",
  topic: "hover:shadow-amber-500/20",
};

const nodeAccentColors: Record<string, string> = {
  main: "bg-amber-400",
  subtopic: "bg-emerald-400",
  tangent: "bg-fuchsia-400",
  topic: "bg-amber-400",
};

const nodeSelectedRing: Record<string, string> = {
  main: "ring-amber-400/80",
  subtopic: "ring-emerald-400/80",
  tangent: "ring-fuchsia-400/80",
  topic: "ring-amber-400/80",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

function TopicNodeComponent({
  data,
  selected,
}: NodeProps): JSX.Element {
  const nodeData = data as TopicNodeData;
  const nodeType = nodeData.nodeType ?? "main";
  const icon = nodeIcons[nodeType] ?? nodeIcons.main;
  const borderColor = nodeBorderColors[nodeType] ?? nodeBorderColors.main;
  const glowColor = nodeGlowColors[nodeType] ?? nodeGlowColors.main;
  const accentColor = nodeAccentColors[nodeType] ?? nodeAccentColors.main;
  const ringColor = nodeSelectedRing[nodeType] ?? nodeSelectedRing.main;
  const isTangent = nodeType === "tangent";

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
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
                "relative min-w-[220px] max-w-[260px]",
                "rounded-xl border backdrop-blur-xl cursor-pointer",
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
                  ringColor,
                  "scale-[1.02]",
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
                  {nodeData.label}
                </span>
              </div>

              {/* Content */}
              <div className="px-4 py-3 space-y-2.5">
                {/* Summary - truncated in node */}
                <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                  {nodeData.summary}
                </p>

                {/* Meta row: Speaker & Timestamp */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  {/* Speaker */}
                  {nodeData.speaker && (
                    <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                      <User className="h-3 w-3" />
                      <span className="font-medium text-white/70">
                        {nodeData.speaker}
                      </span>
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
                    <span className="font-mono font-medium">
                      {nodeData.startTime}
                    </span>
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
          </div>
        </TooltipTrigger>

        {/* Tooltip with full transcript snippet */}
        <TooltipContent
          side="right"
          sideOffset={12}
          className={cn(
            "max-w-[320px] p-0 overflow-hidden",
            "bg-black/90 backdrop-blur-xl border-white/10",
            "shadow-2xl rounded-xl"
          )}
        >
          {/* Tooltip Header */}
          <div
            className={cn(
              "px-4 py-3 border-b border-white/10",
              "bg-gradient-to-r",
              isTangent
                ? "from-fuchsia-500/20 to-transparent"
                : nodeType === "subtopic"
                ? "from-emerald-500/20 to-transparent"
                : "from-amber-500/20 to-transparent"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", accentColor)} />
              <span className="font-semibold text-sm text-white">
                {nodeData.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-white/60">
              {nodeData.speaker && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {nodeData.speaker}
                </span>
              )}
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3" />
                {nodeData.startTime}
                {nodeData.endTime && ` – ${nodeData.endTime}`}
              </span>
            </div>
          </div>

          {/* Full Summary */}
          <div className="px-4 py-3">
            <p className="text-xs text-white/80 leading-relaxed">
              {nodeData.summary}
            </p>
          </div>

          {/* Tooltip Footer */}
          <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02]">
            <p className="text-[10px] text-white/40 text-center">
              Click to jump to timestamp
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const TopicNode = memo(TopicNodeComponent);
