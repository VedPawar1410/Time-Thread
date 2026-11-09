"use client";

import { memo, type CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NodeType } from "@/types/graph";

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
  /** Position in time order, used to stagger the entrance animation */
  revealIndex?: number;
}

const threadLabels: Record<string, string> = {
  main: "Main topic",
  topic: "Main topic",
  subtopic: "Subtopic",
  tangent: "Tangent",
};

const handleClass =
  "!h-2 !w-2 !min-h-0 !min-w-0 !border-0 !bg-[hsl(var(--thread))]";

function TopicNodeComponent({ data, selected }: NodeProps): JSX.Element {
  const nodeData = data as TopicNodeData;
  const nodeType = nodeData.nodeType ?? "main";

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            data-thread={nodeType}
            className="relative"
            style={
              { "--reveal": nodeData.revealIndex ?? 0 } as CSSProperties
            }
          >
            <Handle
              type="target"
              position={Position.Top}
              className={handleClass}
            />

            <div className={cn("loom-card", selected && "loom-card--active")}>
              <h3 className="font-sans font-medium text-[15px] leading-snug text-foreground line-clamp-2">
                {nodeData.label}
              </h3>

              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {nodeData.summary}
              </p>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="text-[hsl(var(--thread))]">
                  {threadLabels[nodeType] ?? threadLabels.main}
                </span>
                {nodeData.speaker && (
                  <span className="truncate">· {nodeData.speaker}</span>
                )}
                <span className="ml-auto font-mono tabular-nums text-foreground/80">
                  {nodeData.startTime}
                </span>
              </div>
            </div>

            <Handle
              type="source"
              position={Position.Bottom}
              className={handleClass}
            />
          </div>
        </TooltipTrigger>

        <TooltipContent
          side="right"
          sideOffset={12}
          className="max-w-[320px] p-4 rounded-xl bg-popover border-border shadow-2xl"
        >
          <p className="font-medium text-sm text-foreground">{nodeData.label}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {nodeData.startTime}
            {nodeData.endTime && ` – ${nodeData.endTime}`}
            {nodeData.speaker && ` · ${nodeData.speaker}`}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-foreground/85">
            {nodeData.summary}
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Click to jump to this moment
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const TopicNode = memo(TopicNodeComponent);
