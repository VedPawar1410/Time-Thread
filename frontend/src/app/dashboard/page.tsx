"use client";

import { useCallback, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TimelineCanvas, demoGraphData } from "@/components/graph/timeline-canvas";

export default function DashboardPage(): JSX.Element {
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  // This will be connected to the video player later
  const handleSeekTo = useCallback((timestamp: number) => {
    setCurrentTime(timestamp);
    console.log(`Seeking to ${timestamp} seconds`);
    // TODO: Connect to video player's seekTo function
  }, []);

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">Conversation Timeline</h1>
            <p className="text-xs text-muted-foreground">
              Click a topic to jump to that timestamp
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {/* Node counts */}
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">
                {demoGraphData.nodes.filter((n) => n.type === "main").length} main
              </span>
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                {demoGraphData.nodes.filter((n) => n.type === "subtopic").length} subtopics
              </span>
              <span className="px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 rounded-md border border-fuchsia-500/20">
                {demoGraphData.nodes.filter((n) => n.type === "tangent").length} tangents
              </span>
            </div>

            {/* Current timestamp indicator */}
            {currentTime !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
                <span className="font-mono font-medium">{formatTime(currentTime)}</span>
                <span className="text-muted-foreground">selected</span>
              </div>
            )}
          </div>
        </header>

        {/* Graph Canvas */}
        <div className="flex-1 relative">
          <TimelineCanvas
            graphData={demoGraphData}
            onSeekTo={handleSeekTo}
            className="w-full h-full bg-background"
          />
        </div>
      </main>
    </div>
  );
}
