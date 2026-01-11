"use client";

import { useCallback, useRef } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import type { ReactPlayerInstance } from "@/components/video/video-player";

/**
 * Hook for synchronizing video playback with the timeline graph.
 * Handles bidirectional sync: video → graph and graph → video.
 */
export function useVideoSync() {
  const playerRef = useRef<ReactPlayerInstance | null>(null);
  const seekingRef = useRef(false);

  // Zustand store access
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setDuration = useTimelineStore((s) => s.setDuration);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const isPlaying = useTimelineStore((s) => s.isPlaying);

  /**
   * Called by ReactPlayer during playback to update current time.
   * Updates the store which triggers active node highlighting.
   */
  const handleProgress = useCallback(
    (state: { playedSeconds: number }) => {
      // Don't update while actively seeking to avoid jitter
      if (!seekingRef.current) {
        setCurrentTime(state.playedSeconds);
      }
    },
    [setCurrentTime]
  );

  /**
   * Called when video duration is known.
   */
  const handleDuration = useCallback(
    (duration: number) => {
      setDuration(duration);
    },
    [setDuration]
  );

  /**
   * Seek to a specific timestamp (e.g., from node click).
   * @param timestamp Time in seconds to seek to
   */
  const seekTo = useCallback((timestamp: number) => {
    if (playerRef.current) {
      seekingRef.current = true;
      playerRef.current.seekTo(timestamp, "seconds");
      // Reset seeking flag after a short delay
      setTimeout(() => {
        seekingRef.current = false;
      }, 100);
    }
  }, []);

  /**
   * Handle play state change from player
   */
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, [setIsPlaying]);

  /**
   * Handle pause state change from player
   */
  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  /**
   * Toggle play/pause programmatically
   */
  const togglePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  return {
    playerRef,
    isPlaying,
    seekTo,
    togglePlayPause,
    handlers: {
      onProgress: handleProgress,
      onDuration: handleDuration,
      onPlay: handlePlay,
      onPause: handlePause,
    },
  };
}
