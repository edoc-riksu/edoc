"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, RotateCcw } from "lucide-react";
import Button from "../components/ui/Button";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center px-4 font-mono text-cyan-400">
      <div
        role="alert"
        className="w-full max-w-lg hud-panel hud-panel-danger p-8 text-center"
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
          <Button variant="primary" icon={RotateCcw} onClick={() => reset()}>
            Try again
          </Button>
          <Button as={Link} href="/" tone="warn">
            Back to base
          </Button>
        </div>
      </div>
    </main>
  );
}
