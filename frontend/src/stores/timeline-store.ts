import { create } from "zustand";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineState {
  /** Current playback time in seconds */
  currentTime: number;
  /** Currently active/highlighted node ID */
  activeNodeId: string | null;
  /** Whether "Follow Mode" is enabled (auto-pan to active node) */
  followMode: boolean;
  /** Total duration of the video in seconds */
  duration: number;
  /** Whether the video is currently playing */
  isPlaying: boolean;
  /** Increases after a map is saved so the sidebar knows to reload */
  mapsVersion: number;
}

interface TimelineActions {
  /** Update the current playback time */
  setCurrentTime: (time: number) => void;
  /** Set the active node ID */
  setActiveNodeId: (nodeId: string | null) => void;
  /** Toggle follow mode on/off */
  toggleFollowMode: () => void;
  /** Set follow mode explicitly */
  setFollowMode: (enabled: boolean) => void;
  /** Set the total duration */
  setDuration: (duration: number) => void;
  /** Set playing state */
  setIsPlaying: (isPlaying: boolean) => void;
  /** Signal that the saved maps list has changed */
  bumpMapsVersion: () => void;
  /** Reset the store to initial state */
  reset: () => void;
}

type TimelineStore = TimelineState & TimelineActions;

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialState: TimelineState = {
  currentTime: 0,
  activeNodeId: null,
  followMode: true, // Enabled by default for premium UX
  duration: 0,
  isPlaying: false,
  mapsVersion: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useTimelineStore = create<TimelineStore>((set) => ({
  ...initialState,

  setCurrentTime: (time) => set({ currentTime: time }),

  setActiveNodeId: (nodeId) => set({ activeNodeId: nodeId }),

  toggleFollowMode: () => set((state) => ({ followMode: !state.followMode })),

  setFollowMode: (enabled) => set({ followMode: enabled }),

  setDuration: (duration) => set({ duration }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  bumpMapsVersion: () =>
    set((state) => ({ mapsVersion: state.mapsVersion + 1 })),

  reset: () => set(initialState),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Selectors (for optimized re-renders)
// ─────────────────────────────────────────────────────────────────────────────

export const selectCurrentTime = (state: TimelineStore) => state.currentTime;
export const selectActiveNodeId = (state: TimelineStore) => state.activeNodeId;
export const selectFollowMode = (state: TimelineStore) => state.followMode;
export const selectIsPlaying = (state: TimelineStore) => state.isPlaying;
