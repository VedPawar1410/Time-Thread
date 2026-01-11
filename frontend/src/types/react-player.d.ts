// Type declarations for react-player (v3)
declare module "react-player" {
  import { Component } from "react";

  export interface ReactPlayerProps {
    url?: string;
    playing?: boolean;
    loop?: boolean;
    controls?: boolean;
    light?: boolean | string;
    volume?: number;
    muted?: boolean;
    playbackRate?: number;
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
    progressInterval?: number;
    playsinline?: boolean;
    pip?: boolean;
    stopOnUnmount?: boolean;
    fallback?: React.ReactNode;
    wrapper?: React.ComponentType<{ children: React.ReactNode }>;
    playIcon?: React.ReactNode;
    previewTabIndex?: number;
    config?: {
      youtube?: {
        playerVars?: Record<string, unknown>;
        embedOptions?: Record<string, unknown>;
      };
      [key: string]: unknown;
    };
    onReady?: (player: ReactPlayer) => void;
    onStart?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    onBuffer?: () => void;
    onBufferEnd?: () => void;
    onEnded?: () => void;
    onError?: (error: Error) => void;
    onDuration?: (duration: number) => void;
    onSeek?: (seconds: number) => void;
    onProgress?: (state: {
      played: number;
      playedSeconds: number;
      loaded: number;
      loadedSeconds: number;
    }) => void;
  }

  export default class ReactPlayer extends Component<ReactPlayerProps> {
    static canPlay(url: string): boolean;
    seekTo(amount: number, type?: "seconds" | "fraction"): void;
    getCurrentTime(): number;
    getSecondsLoaded(): number;
    getDuration(): number;
    getInternalPlayer(key?: string): unknown;
    showPreview(): void;
  }
}
