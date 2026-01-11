"use client";

import { useCallback, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Crosshair,
  Play,
  Pause,
  Loader2,
  Youtube,
  Search,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import {
  TimelineCanvas,
  demoGraphData,
  parseTimestamp,
} from "@/components/graph/timeline-canvas";
import { VideoPlayer } from "@/components/video/video-player";
import { useVideoSync } from "@/hooks/useVideoSync";
import {
  useTimelineStore,
  selectCurrentTime,
  selectFollowMode,
  selectIsPlaying,
} from "@/stores/timeline-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { mapsApi } from "@/lib/supabase";
import type { AIGraphResponse } from "@/types/graph";

function DashboardContent(): JSX.Element {
  const searchParams = useSearchParams();
  const mapId = searchParams.get("map");

  // Video sync hook
  const { playerRef, seekTo, handlers } = useVideoSync();

  // Zustand store
  const currentTime = useTimelineStore(selectCurrentTime);
  const followMode = useTimelineStore(selectFollowMode);
  const isPlaying = useTimelineStore(selectIsPlaying);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const toggleFollowMode = useTimelineStore((s) => s.toggleFollowMode);

  // Local state
  const [videoUrl, setVideoUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [graphData, setGraphData] = useState<AIGraphResponse>(demoGraphData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sidebar hidden on mobile by default
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [videoCollapsed, setVideoCollapsed] = useState(false);

  // Load map from URL param
  useEffect(() => {
    if (mapId) {
      loadMap(mapId);
    }
  }, [mapId]);

  const loadMap = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const map = await mapsApi.getById(id);
      if (map) {
        setGraphData(map.graph_data);
        if (map.video_url) {
          setVideoUrl(map.video_url);
          setInputUrl(map.video_url);
        }
      }
    } catch (err) {
      setError("Failed to load map");
    } finally {
      setLoading(false);
    }
  };

  // Handle processing a new video
  const handleProcess = async () => {
    if (!inputUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.processTranscript(inputUrl);

      if (result.success && result.graph) {
        setGraphData(result.graph);
        setVideoUrl(inputUrl);

        // Save to Supabase
        await mapsApi.create({
          name: `Video ${result.video_id ?? "Untitled"}`,
          video_id: result.video_id ?? undefined,
          video_url: inputUrl,
          graph_data: result.graph,
          raw_transcript: result.raw_transcript ?? undefined,
        });
      } else {
        setError(result.message || "Processing failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process video");
    } finally {
      setLoading(false);
    }
  };

  // Handle seeking from node click
  const handleSeekTo = useCallback(
    (timestamp: number) => {
      seekTo(timestamp);
    },
    [seekTo]
  );

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Desktop Sidebar - Always visible, collapsible */}
        <div className="hidden md:block flex-shrink-0">
          <Sidebar />
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar panel */}
            <div className="fixed left-0 top-0 h-full z-50 md:hidden w-64 shadow-2xl">
              <Sidebar />
            </div>
          </>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-3 md:px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Mobile sidebar toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>

              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold">Conversation Timeline</h1>
                <p className="text-xs text-muted-foreground">
                  Click nodes to jump • Hover for details
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Node type counts - hidden on mobile */}
              <div className="hidden lg:flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">
                  {graphData.nodes.filter((n) => n.type === "main").length} main
                </span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                  {graphData.nodes.filter((n) => n.type === "subtopic").length}{" "}
                  subtopics
                </span>
                <span className="px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 rounded-md border border-fuchsia-500/20">
                  {graphData.nodes.filter((n) => n.type === "tangent").length}{" "}
                  tangents
                </span>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-6 bg-border" />

              {/* Playback controls */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={cn(
                      "h-8 w-8",
                      isPlaying && "text-primary bg-primary/10"
                    )}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isPlaying ? "Pause" : "Play"}</TooltipContent>
              </Tooltip>

              {/* Follow Mode Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFollowMode}
                    className={cn(
                      "h-8 gap-1 md:gap-2 text-xs",
                      followMode
                        ? "text-primary bg-primary/10 border border-primary/30"
                        : "text-muted-foreground"
                    )}
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Follow</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {followMode
                    ? "Auto-center on active node"
                    : "Enable auto-centering"}
                </TooltipContent>
              </Tooltip>

              {/* Current timestamp */}
              {currentTime > 0 && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
                  <span className="font-mono font-medium text-sm">
                    {formatTime(currentTime)}
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* URL Input Bar */}
          <div className="h-12 border-b border-border bg-card/30 flex items-center gap-2 px-3 md:px-6 flex-shrink-0">
            <Youtube className="h-4 w-4 text-red-500 flex-shrink-0" />
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube URL and press Enter..."
              className="flex-1 h-8 bg-background/50 border-white/10 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleProcess()}
            />
            <Button
              size="sm"
              onClick={handleProcess}
              disabled={loading || !inputUrl.trim()}
              className="h-8 gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Process</span>
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Content Area - Split Layout */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Video Player - Responsive */}
            {videoUrl && (
              <div
                className={cn(
                  "flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border",
                  "transition-all duration-300",
                  videoCollapsed
                    ? "h-0 lg:h-auto lg:w-0"
                    : "h-[30vh] sm:h-[35vh] lg:h-auto lg:w-[40%] xl:w-[35%]"
                )}
              >
                <div className="relative w-full h-full p-2 md:p-4">
                  <VideoPlayer
                    ref={playerRef}
                    url={videoUrl}
                    playing={isPlaying}
                    {...handlers}
                    className="w-full h-full"
                  />
                  {/* Collapse toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 h-6 w-6 bg-black/50 hover:bg-black/70"
                    onClick={() => setVideoCollapsed(!videoCollapsed)}
                  >
                    {videoCollapsed ? (
                      <PanelLeft className="h-3 w-3" />
                    ) : (
                      <PanelLeftClose className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Graph Canvas */}
            <div className="flex-1 relative min-h-0">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center bg-background">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing transcript...
                    </p>
                  </div>
                </div>
              ) : (
                <TimelineCanvas
                  graphData={graphData}
                  onSeekTo={handleSeekTo}
                  className="w-full h-full bg-background"
                />
              )}

              {/* Legend Overlay - Hidden on mobile */}
              <div className="hidden md:block absolute bottom-4 left-4 p-3 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 text-xs space-y-2">
                <p className="text-white/60 font-medium mb-2">Layout Guide</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-amber-400" />
                  <span className="text-white/70">X=0 : Main Topics</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-emerald-400" />
                  <span className="text-white/70">X=200 : Subtopics</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-fuchsia-400" />
                  <span className="text-white/70">X=400 : Tangents</span>
                </div>
                <div className="pt-1 border-t border-white/10 mt-2">
                  <span className="text-white/50">Y = Time (100px/min)</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function DashboardPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
