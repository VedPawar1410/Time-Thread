"use client";

import { useCallback, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Crosshair,
  Play,
  Pause,
  Loader2,
  Youtube,
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
import { api, mapsApi } from "@/lib/api";
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
  const bumpMapsVersion = useTimelineStore((s) => s.bumpMapsVersion);

  // Local state
  const [videoUrl, setVideoUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [graphData, setGraphData] = useState<AIGraphResponse>(demoGraphData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
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
    setWarning(null);
    try {
      const map = await mapsApi.getById(id);
      setGraphData(map.graph_data);
      if (map.video_url) {
        setVideoUrl(map.video_url);
        setInputUrl(map.video_url);
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
    setWarning(null);

    try {
      const result = await api.processTranscript(inputUrl);

      if (result.success && result.graph) {
        setWarning(result.warning);
        setGraphData(result.graph);
        setVideoUrl(inputUrl);

        // The graph is already on screen, so a failed save is only a warning
        try {
          await mapsApi.create({
            name: `Video ${result.video_id ?? "Untitled"}`,
            video_id: result.video_id ?? undefined,
            video_url: inputUrl,
            graph_data: result.graph,
            raw_transcript: result.raw_transcript ?? undefined,
          });
          bumpMapsVersion();
        } catch (saveError) {
          console.error("Failed to save map:", saveError);
          setWarning(
            [result.warning, "This graph could not be saved."]
              .filter(Boolean)
              .join(" ")
          );
        }
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
      <div className="loom-surface flex h-screen w-screen overflow-hidden">
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
          {/* Toolbar */}
          <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md flex items-center gap-2 md:gap-4 px-3 md:px-5 flex-shrink-0">
            {/* Mobile sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              className="h-9 w-9 md:hidden flex-shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>

            {/* The main action: weave a video into a timeline */}
            <div className="relative flex-1 min-w-0 max-w-2xl">
              <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                aria-label="YouTube link"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste a YouTube link"
                className="h-10 rounded-full bg-background/70 pl-10 pr-24 text-sm focus-visible:ring-offset-0"
                onKeyDown={(e) => e.key === "Enter" && handleProcess()}
              />
              <Button
                size="sm"
                onClick={handleProcess}
                disabled={loading || !inputUrl.trim()}
                className="absolute right-1 top-1 h-8 rounded-full px-4 gap-1.5"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Weave
              </Button>
            </div>

            <div className="ml-auto flex items-center gap-1 md:gap-3 flex-shrink-0">
              {/* Thread counts */}
              <div className="hidden xl:flex items-center gap-4 text-xs text-muted-foreground mr-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-node-main" />
                  {graphData.nodes.filter((n) => n.type === "main").length} main
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-node-subtopic" />
                  {graphData.nodes.filter((n) => n.type === "subtopic").length}{" "}
                  subtopics
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-node-tangent" />
                  {graphData.nodes.filter((n) => n.type === "tangent").length}{" "}
                  tangents
                </span>
              </div>

              {/* Always rendered once a video is loaded, so controls don't shift */}
              {videoUrl && (
                <span className="hidden sm:block font-mono text-sm tabular-nums text-foreground/80 min-w-[3.5rem] text-right">
                  {formatTime(currentTime)}
                </span>
              )}

              {/* Playback controls */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isPlaying ? "Pause" : "Play"}
                    disabled={!videoUrl}
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={cn(
                      "h-9 w-9 rounded-full",
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
                    aria-pressed={followMode}
                    aria-label="Follow the active topic"
                    onClick={toggleFollowMode}
                    className={cn(
                      "h-9 rounded-full gap-1.5 text-xs",
                      followMode
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground"
                    )}
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Follow</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {followMode
                    ? "The view follows the active topic"
                    : "Let the view follow the active topic"}
                </TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="px-6 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm"
            >
              {error}
            </div>
          )}

          {/* Non-fatal warning, e.g. a truncated transcript */}
          {warning && (
            <div className="px-6 py-2 bg-primary/10 border-b border-primary/20 text-primary text-sm">
              {warning}
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
                    key={videoUrl}
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
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing transcript...
                    </p>
                  </div>
                </div>
              ) : (
                <TimelineCanvas
                  graphData={graphData}
                  onSeekTo={handleSeekTo}
                  className="w-full h-full"
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
                  <span className="text-white/70">X=320 : Subtopics</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-fuchsia-400" />
                  <span className="text-white/70">X=640 : Tangents</span>
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
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
