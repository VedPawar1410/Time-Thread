import Link from "next/link";
import { ArrowRight, GitBranch, FileText, Zap } from "lucide-react";

export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <GitBranch className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Time<span className="text-primary">-</span>Thread
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl text-muted-foreground max-w-2xl animate-fade-in [animation-delay:100ms]">
            Transform long-form transcripts into interactive, branching visual
            graphs. Map conversations through time.
          </p>

          {/* CTA */}
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-all animate-fade-in [animation-delay:200ms]"
          >
            Open Dashboard
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 max-w-4xl mx-auto">
          <FeatureCard
            icon={<FileText className="h-6 w-6" />}
            title="Multi-Source Input"
            description="Process YouTube videos, PDFs, and audio files into structured content."
            delay="300ms"
          />
          <FeatureCard
            icon={<GitBranch className="h-6 w-6" />}
            title="Visual Branching"
            description="See how topics branch and connect with an interactive graph."
            delay="400ms"
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="AI-Powered"
            description="Automatically identify topics, questions, and key insights."
            delay="500ms"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full py-6 text-center text-sm text-muted-foreground">
        <p>Built with Next.js, FastAPI, and React Flow</p>
      </footer>
    </main>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: FeatureCardProps): JSX.Element {
  return (
    <div
      className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors animate-fade-in"
      style={{ animationDelay: delay }}
    >
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
