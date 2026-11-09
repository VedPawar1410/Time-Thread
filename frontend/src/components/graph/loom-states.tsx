"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Three silk threads crossing, used by the empty and waiting screens. */
export function LoomThreads({
  moving,
  className = "w-60",
}: {
  moving?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 240 96"
      aria-hidden="true"
      className={`${moving ? "loom-weave" : "loom-weave--still"} ${className}`}
    >
      <path
        pathLength={300}
        stroke="hsl(var(--node-main))"
        d="M4 48 C 60 4, 90 92, 136 48 S 208 12, 236 40"
      />
      <path
        pathLength={300}
        stroke="hsl(var(--node-subtopic))"
        d="M4 24 C 56 84, 104 8, 150 58 S 214 86, 236 62"
      />
      <path
        pathLength={300}
        stroke="hsl(var(--node-tangent))"
        d="M4 72 C 48 30, 96 92, 128 30 S 206 46, 236 18"
      />
    </svg>
  );
}

export function EmptyState({
  onShowSample,
}: {
  onShowSample: () => void;
}): JSX.Element {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 px-6 text-center animate-fade-in">
      <LoomThreads />
      <div className="max-w-md">
        <h2 className="text-3xl leading-tight text-foreground">
          Every conversation is a thread.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Paste a YouTube link above to see where it went: the main topics, the
          side roads, and the way back.
        </p>
      </div>
      <Button variant="outline" className="rounded-full" onClick={onShowSample}>
        See a sample
      </Button>
    </div>
  );
}

// These advance on a timer: the server doesn't report real progress.
const WEAVING_STAGES = [
  { after: 0, label: "Fetching the transcript" },
  { after: 3000, label: "Reading the conversation" },
  { after: 12000, label: "Weaving the threads" },
  { after: 28000, label: "Long conversation, nearly there" },
];

export function WeavingState(): JSX.Element {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = WEAVING_STAGES.slice(1).map(({ after }, index) =>
      setTimeout(() => setStage(index + 1), after)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-6 text-center animate-fade-in">
      <LoomThreads moving />
      <p
        aria-live="polite"
        className="font-display text-xl text-foreground"
      >
        {WEAVING_STAGES[stage].label}
      </p>
      <p className="text-xs text-muted-foreground">
        Longer videos can take a minute or more.
      </p>
    </div>
  );
}
