import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center px-4 font-mono text-cyan-400">
      <div className="w-full max-w-lg hud-panel p-8 text-center">
        <Compass className="w-8 h-8 mx-auto mb-4 text-amber-400 animate-pulse" aria-hidden="true" />
        <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-500">Error 404 // Signal lost</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-wide text-white uppercase">
          No sector at these coordinates
        </h1>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          The link you followed doesn&apos;t lead anywhere on the star chart. Return to the cockpit and plot a new course.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button as={Link} href="/cockpit" variant="primary">
            Return to cockpit
          </Button>
          <Button as={Link} href="/" tone="warn" icon={ArrowLeft}>
            Back to base
          </Button>
        </div>
      </div>
    </main>
  );
}
