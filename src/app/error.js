"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, RotateCcw } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center px-4 font-mono text-cyan-400">
      <div
        role="alert"
        className="w-full max-w-lg bg-slate-950/25 backdrop-blur-md border border-red-500/30 shadow-[0_0_20px_rgba(255,60,60,0.08)] p-8 text-center"
      >
        <TriangleAlert className="w-8 h-8 mx-auto mb-4 text-red-400 animate-pulse" aria-hidden="true" />
        <p className="text-[10px] tracking-[0.4em] uppercase text-red-400">System fault // Avionics</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-wide text-white uppercase">
          Something went wrong
        </h1>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          A system on the ship failed. Your saved progress is not affected. Try the module again, or head back to base.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-semibold tracking-wide uppercase bg-cyan-600 text-slate-100 hover:brightness-110 transition cursor-pointer"
          >
            <RotateCcw size={14} aria-hidden="true" /> Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 text-[11px] tracking-wide uppercase text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition"
          >
            Back to base
          </Link>
        </div>
      </div>
    </main>
  );
}
