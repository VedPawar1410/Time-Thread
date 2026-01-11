"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { FlowCanvas } from "@/components/graph/flow-canvas";

export default function DashboardPage(): JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">Conversation Graph</h1>
            <p className="text-xs text-muted-foreground">
              Demo visualization • Click and drag nodes to rearrange
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-primary/10 text-primary rounded-md">
              5 nodes
            </span>
            <span className="px-2 py-1 bg-secondary rounded-md">5 edges</span>
          </div>
        </header>

        {/* Graph Canvas */}
        <div className="flex-1 relative">
          <FlowCanvas />
        </div>
      </main>
    </div>
  );
}
