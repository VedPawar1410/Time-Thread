import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";
import { LoomThreads } from "@/components/graph/loom-states";

const READ_ONLY = process.env.NEXT_PUBLIC_READ_ONLY === "true";

const steps = [
  {
    title: "Paste a link",
    description: "Any YouTube video with captions.",
    rule: "bg-node-main",
  },
  {
    title: "Watch it weave",
    description: "AI finds the main topics, the tangents and the way back.",
    rule: "bg-node-subtopic",
  },
  {
    title: "Follow the thread",
    description: "Click any moment to jump there. Threads light up as you watch.",
    rule: "bg-node-tangent",
  },
];

export default function HomePage(): JSX.Element {
  return (
    <main className="loom-surface min-h-screen flex flex-col">
      <header className="w-full max-w-6xl mx-auto px-6 md:px-10 pt-8 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
          <GitBranch className="h-5 w-5 text-primary" />
        </div>
        <span className="font-display text-xl tracking-tight">
          Time<span className="text-primary">-</span>Thread
        </span>
      </header>

      <section className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-10 py-14 grid lg:grid-cols-[1.15fr_1fr] items-center gap-12">
        <div className="animate-fade-in">
          <h1 className="text-5xl md:text-6xl leading-[1.06] text-foreground">
            See where a conversation actually went.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Paste a YouTube link and get a timeline of its main topics, side
            roads and returns, synced to the video.
          </p>
          <Link
            href="/dashboard"
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {READ_ONLY ? "Explore timelines" : "Start weaving"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          {READ_ONLY && (
            <p className="mt-5 max-w-lg text-xs leading-relaxed text-muted-foreground">
              This live demo shows timelines already woven. YouTube blocks
              transcript requests from cloud servers, so new videos are
              processed locally.
            </p>
          )}
        </div>

        <LoomThreads moving className="w-full" />
      </section>

      <ol className="w-full max-w-6xl mx-auto px-6 md:px-10 pb-14 grid md:grid-cols-3 gap-8">
        {steps.map((step) => (
          <li key={step.title}>
            <div className={`h-0.5 w-12 rounded-full ${step.rule}`} />
            <h2 className="mt-4 text-xl text-foreground">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </main>
  );
}
