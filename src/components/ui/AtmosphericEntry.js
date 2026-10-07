"use client";
import React from "react";

/**
 * 🔥 ATMOSPHERIC ENTRY — the "friction blast arrival" screen.
 * -------------------------------------------------------------
 * Purely decorative, self-timed overlay: no click, no state beyond
 * what the parent already tracks. Mount it, let it play, unmount it
 * (the parent's own `arriving` flag controls that — see SectorDetail).
 * A dozen horizontal streaks sweep left-to-right on staggered delays
 * to read as high-velocity air-stream friction, then the whole layer
 * fades to reveal the surface dashboard underneath.
 */

const STREAK_ROWS = [8, 18, 27, 34, 41, 48, 55, 62, 69, 76, 84, 92];

export default function AtmosphericEntry({ accent = "#22d3ee" }) {
  return (
    <div className="absolute inset-0 z-40 overflow-hidden pointer-events-none animate-arrival-clear" aria-hidden="true">
      <div className="absolute inset-0 bg-black" />
      {STREAK_ROWS.map((top, i) => (
        <div
          key={top}
          className="absolute left-0 h-[2px] w-1/3 animate-friction-streak"
          style={{
            top: `${top}%`,
            background: `linear-gradient(90deg, transparent, ${accent}, #ffffff, ${accent}, transparent)`,
            boxShadow: `0 0 10px 1px ${accent}`,
            animationDelay: `${(i % 4) * 40}ms`
          }}
        />
      ))}
      {/* A few thicker "spark" streaks for texture */}
      {[15, 44, 71].map((top, i) => (
        <div
          key={`spark-${top}`}
          className="absolute left-0 h-[5px] w-1/4 blur-[1px] animate-friction-streak"
          style={{
            top: `${top}%`,
            background: `linear-gradient(90deg, transparent, ${accent}cc, transparent)`,
            animationDelay: `${90 + i * 55}ms`
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 50%, ${accent}22 0%, transparent 60%)` }}
      />
    </div>
  );
}
