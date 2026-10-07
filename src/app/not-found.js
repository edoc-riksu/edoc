import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center px-4 font-mono text-cyan-400">
      <div className="w-full max-w-lg bg-slate-950/25 backdrop-blur-md border border-cyan-500/20 shadow-[0_0_20px_rgba(0,240,255,0.05)] p-8 text-center">
        <Compass className="w-8 h-8 mx-auto mb-4 text-amber-400 animate-pulse" aria-hidden="true" />
        <p className="text-[10px] tracking-[0.4em] uppercase text-cyan-500">Error 404 // Signal lost</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-wide text-white uppercase">
          No sector at these coordinates
        </h1>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          The link you followed doesn&apos;t lead anywhere on the star chart. Return to the cockpit and plot a new course.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/cockpit"
            className="px-5 py-2.5 text-[11px] font-semibold tracking-wide uppercase bg-cyan-600 text-slate-100 hover:brightness-110 transition"
          >
            Return to cockpit
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] tracking-wide uppercase text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Back to base
          </Link>
        </div>
      </div>
    </main>
  );
}
