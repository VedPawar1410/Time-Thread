"use client";

import { forwardRef, useState, useImperativeHandle, useRef } from "react";
import type ReactPlayerClass from "react-player";
import dynamic from "next/dynamic";
import { Loader2, Youtube, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Type for ReactPlayer instance methods we need
export interface ReactPlayerInstance {
  seekTo: (amount: number, type?: "seconds" | "fraction") => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

// Dynamically import ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/50">
      <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
    </div>
  ),
});

interface ReactPlayerProps {
  ref?: React.Ref<ReactPlayerInstance>;
  url: string;
  playing?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
  onProgress?: (state: { playedSeconds: number }) => void;
  onDuration?: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onReady?: () => void;
  onError?: () => void;
  progressInterval?: number;
  config?: Record<string, unknown>;
}

interface VideoPlayerProps {
  /** YouTube video URL */
  url: string;
  /** Whether video is playing */
  playing?: boolean;
  /** Progress callback */
  onProgress?: (state: { playedSeconds: number }) => void;
  /** Duration callback when video loads */
  onDuration?: (duration: number) => void;
  /** Play callback */
  onPlay?: () => void;
  /** Pause callback */
  onPause?: () => void;
  /** Optional className */
  className?: string;
}

/**
 * Video player component with YouTube support.
 * Designed to be used with useVideoSync hook.
 */
export const VideoPlayer = forwardRef<ReactPlayerInstance, VideoPlayerProps>(
  function VideoPlayer(
    { url, playing, onProgress, onDuration, onPlay, onPause, className },
    ref
  ) {
    const [error, setError] = useState(false);
    const [ready, setReady] = useState(false);
    const internalRef = useRef<ReactPlayerClass | null>(null);

    // Expose the internal ref through the forwarded ref
    useImperativeHandle(ref, () => ({
      seekTo: (amount: number, type?: "seconds" | "fraction") => {
        internalRef.current?.seekTo(amount, type);
      },
      getCurrentTime: () => internalRef.current?.getCurrentTime?.() ?? 0,
      getDuration: () => internalRef.current?.getDuration?.() ?? 0,
    }));

    if (!url) {
      return (
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-center gap-3",
            "bg-gradient-to-br from-black/60 to-black/40 rounded-xl",
            "border border-white/10",
            className
          )}
        >
          <Youtube className="h-12 w-12 text-amber-400/50" />
          <p className="text-sm text-white/50">No video loaded</p>
        </div>
      );
    }

    if (error) {
      return (
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-center gap-3",
            "bg-gradient-to-br from-red-950/30 to-black/40 rounded-xl",
            "border border-red-500/20",
            className
          )}
        >
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm text-red-300">Failed to load video</p>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "relative w-full h-full rounded-xl overflow-hidden",
          "bg-black shadow-2xl",
          "ring-1 ring-white/10",
          className
        )}
      >
        {/* Loading overlay */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        )}

        <ReactPlayer
          url={url}
          playing={playing}
          controls
          width="100%"
          height="100%"
          onProgress={onProgress}
          onDuration={onDuration}
          onPlay={onPlay}
          onPause={onPause}
          onReady={(player) => {
            internalRef.current = player;
            setReady(true);
          }}
          onError={() => setError(true)}
          progressInterval={250}
          config={{
            youtube: {
              playerVars: {
                modestbranding: 1,
                rel: 0,
              },
            },
          }}
        />
      </div>
    );
  }
);
