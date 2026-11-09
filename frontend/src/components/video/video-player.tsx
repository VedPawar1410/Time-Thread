"use client";

import { forwardRef, useState, useImperativeHandle, useRef } from "react";
import ReactPlayer from "react-player";
import { Loader2, Youtube, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Type for ReactPlayer instance methods we need
export interface ReactPlayerInstance {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
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
    // In react-player v3 the ref is a media element, like a <video> tag
    const internalRef = useRef<HTMLVideoElement | null>(null);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (internalRef.current) {
          internalRef.current.currentTime = seconds;
        }
      },
      getCurrentTime: () => internalRef.current?.currentTime ?? 0,
      getDuration: () => internalRef.current?.duration ?? 0,
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
          <Youtube className="h-12 w-12 text-primary/50" />
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <ReactPlayer
          ref={internalRef}
          src={url}
          playing={playing}
          controls
          width="100%"
          height="100%"
          onTimeUpdate={(e) =>
            onProgress?.({ playedSeconds: e.currentTarget.currentTime })
          }
          onDurationChange={(e) => {
            // onReady relies on loadstart, which YouTube can fire too early
            // for the listener to catch, so treat a known duration as ready.
            setReady(true);
            onDuration?.(e.currentTarget.duration);
          }}
          onPlay={onPlay}
          onPause={onPause}
          onError={() => setError(true)}
          config={{ youtube: { rel: 0 } }}
        />
      </div>
    );
  }
);
