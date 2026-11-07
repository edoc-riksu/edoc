"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Lock, Rocket, UserRound } from "lucide-react";
import AppShell from "../../shell/AppShell";
import Button from "../../ui/Button";
import Segmented from "../../ui/Segmented";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { conceptFor } from "../../data/concepts";
import "./modules.css";

/** A module's own distinct concepts, in first-seen order - no invented copy. */
function conceptNamesFor(encounters) {
  const seen = new Set();
  const names = [];
  for (const e of encounters || []) {
    for (const c of e.concepts || []) {
      if (seen.has(c)) continue;
      seen.add(c);
      names.push(conceptFor(c).name);
    }
  }
  return names;
}

const pad2 = (n) => String(n).padStart(2, "0");

/* One pin per topic on the surface (where each stands: VIDEO_SPOTS below). `slug` matches a real module's slug when
   one exists (today, only "python-basics" does) - the rest render as locked
   "coming soon" pins, by name only, until those modules are real. */
const SURFACE_MARKERS = [
  { slug: "python-basics", title: "Python Basics", w: 214, tail: "down", place: "Mushroom clearing" },
  { slug: "strings", title: "Strings", w: 160, tail: "down", place: "Ruined arch" },
  { slug: "functions", title: "Functions", w: 176, tail: "down", place: "Lantern trees" },
  { slug: "loops", title: "Loops", w: 185, tail: "down", place: "Waterfall pool" },
  { slug: "sets", title: "Sets", w: 217, tail: "down", place: "Crystal mountain" },
  { slug: "lists", title: "Lists", w: 243, tail: "down", place: "Mossy cliff" },
  { slug: "dictionaries", title: "Dictionaries", w: 214, tail: "down", place: "Giant tree" },
  { slug: "conditions", title: "Conditions", w: 196, tail: "down", place: "Fern ledge" },
  { slug: "tuples", title: "Tuples", w: 186, tail: "down", place: "Toadstool bank" },
  { slug: "errors", title: "Errors & Exceptions", w: 276, tail: "down", place: "Cliff edge" }
];

/* The map is the full-screen looping video. Where each pin's tail touches it, as shares across and down the video (1920 x 1080),
   at the place its name says (each name is something you can see in the video: the arch, the lantern trees, the waterfall pool, the crystal mountain). */
const VIDEO_W = 1920;
const VIDEO_H = 1080;
const VIDEO_SPOTS = {
  "python-basics": [0.2, 0.92],
  strings: [0.3, 0.5],
  functions: [0.84, 0.6],
  loops: [0.62, 0.8],
  sets: [0.66, 0.36],
  lists: [0.45, 0.56],
  dictionaries: [0.11, 0.5],
  conditions: [0.35, 0.8],
  tuples: [0.82, 0.88],
  errors: [0.72, 0.5]
};

/**
 * Plan Day 29: the module list for one planet - an illustrated surface map,
 * one pin per topic. Selecting a real topic opens its own encounter list
 * (Day 30's module detail screen) rather than showing anything inline here,
 * so this screen stays just the map (plus a List view of the same pins) and
 * the shared AppShell header - no extra title/stats chrome of its own.
 *
 * Wraps itself in AuthProvider/Suspense/Gate, same convention as
 * hangar/page.js and profile/page.js, since this screen (unlike those)
 * is rendered from an async server page.js that can't itself be a client
 * component.
 */
export default function ModuleListScreen({ planetId, planetName }) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <ModuleListGate planetId={planetId} planetName={planetName} />
      </Suspense>
    </AuthProvider>
  );
}

function ModuleListGate({ planetId, planetName }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [modules, setModules] = useState(null); // null = loading
  const [progress, setProgress] = useState(null); // slug -> progress
  const [view, setView] = useState("map");
  const [still, setStill] = useState(false); // only a data saver keeps the still picture; the background otherwise always plays
  const [vp, setVp] = useState({ W: 1376, H: 768 }); // the window, which the full-screen map fills

  useEffect(() => {
    const fit = () => setVp({ W: window.innerWidth, H: window.innerHeight });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    // The background loop is part of the screen and always plays. It is not tied to the app's motion setting (the galaxy screen
    // saves "reduced" there by itself whenever the computer's reduce-motion switch is on, which froze it for everyone) or to the
    // computer's own switch. Only a data saver keeps the still picture.
    setStill(!!navigator.connection?.saveData);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace(`/signin?returnTo=${encodeURIComponent(`/planet/${planetId}/modules`)}`);
  }, [loading, user, router, planetId]);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/modules?planet=${encodeURIComponent(planetId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      const list = data?.modules || [];
      if (cancelled) return;
      setModules(list);

      const entries = await Promise.all(
        list.map(async (m) => {
          const r = await fetch(`/api/modules/${m.slug}/progress`, { cache: "no-store" });
          const d = await r.json().catch(() => null);
          return [m.slug, d?.progress || null];
        })
      );
      if (!cancelled) setProgress(Object.fromEntries(entries));
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [user, planetId]);

  if (loading || !user) return null;

  // Where a pin stands on screen, in pixels. The video fills the window, cropped to fit, so each pin stays on its spot whatever the
  // window shape; in a tall or near-square window (a phone, a half-width browser) the pins zig-zag up the screen instead.
  const portrait = vp.W / vp.H < 1.25; // too narrow to show the whole video: the crop would push the side pins off or onto each other
  const pinSpot = (mk, i) => {
    const { W, H } = vp;
    if (portrait) {
      const step = Math.min(70, (H - 250) / (SURFACE_MARKERS.length - 1));
      return { x: i % 2 ? W - 112 : 112, y: H - 56 - i * step };
    }
    const k = Math.max(W / VIDEO_W, H / VIDEO_H);
    const ax = VIDEO_SPOTS[mk.slug][0];
    const ay = VIDEO_SPOTS[mk.slug][1];
    const x = (W - VIDEO_W * k) / 2 + ax * VIDEO_W * k;
    const y = (H - VIDEO_H * k) / 2 + ay * VIDEO_H * k;
    return { x: Math.min(W - 112, Math.max(112, x)), y: Math.min(H - 28, Math.max(150, y)) };
  };

  // One summary per real module - the surface map's "coming soon" pins are
  // the rest of SURFACE_MARKERS, since they have no slug/progress of their own.
  const summaries = (modules || []).map((m) => {
    const p = progress?.[m.slug];
    const cleared = p?.solvedCount ?? 0;
    const total = p?.totalCount ?? m.encounterCount ?? 0;
    return {
      slug: m.slug,
      order: m.order,
      title: m.title,
      concepts: p ? conceptNamesFor(p.encounters) : [],
      cleared,
      total
    };
  });

  // Current = first module that isn't finished (gets the "Continue" tag).
  const current = summaries.find((m) => m.cleared < m.total) ?? summaries[summaries.length - 1];

  const viewToggle = (
    <Segmented
      label="View"
      value={view}
      onChange={setView}
      options={[
        { value: "map", label: "Map" },
        { value: "list", label: "List" }
      ]}
    />
  );

  return (
    <AppShell
      section={`${planetName.toUpperCase()} MODULES`}
      tools={
        <>
          <Button variant="secondary" iconOnly icon={UserRound} href="/profile" aria-label="Open profile" />
          <Button variant="secondary" iconOnly icon={Rocket} href="/" aria-label="Back to the galaxy" />
        </>
      }
    >
      <div className="ml-wrap ml-wrap--map">
        {modules === null ? (
          <p className="t-body">Loading modules…</p>
        ) : summaries.length === 0 ? (
          <p className="t-body">No modules yet for {planetName}.</p>
        ) : (
          <section className="mm-stage-wrap" aria-label={`${planetName} surface`}>
            {view === "list" && <div className="mm-view-toggle">{viewToggle}</div>}

            {view === "map" ? (
              <div className="mm-stage mm-stage--full">
                {still ? (
                  <img src="/art/modules/python-surface-poster.jpg" alt="" className="mm-stage-art" draggable="false" />
                ) : (
                  <video
                    className="mm-stage-art"
                    poster="/art/modules/python-surface-poster.jpg"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    aria-hidden="true"
                    disablePictureInPicture
                    tabIndex={-1}
                  >
                    <source src="/art/modules/python-surface.webm" type="video/webm" />
                    <source src="/art/modules/python-surface.mp4" type="video/mp4" />
                  </video>
                )}
                <div className="mm-stage-fx" aria-hidden="true" hidden>
                  <span className="mm-fx-lanterns" />
                  <span className="mm-fx-falls" />
                  <span className="mm-fx-falls-sm" />
                  <span className="mm-fx-mist" />
                  <span className="mm-fx-crystal" />
                  <span className="mm-fx-house" />
                  <span className="mm-fx-pad" />
                  {Array.from({ length: 10 }, (_, i) => (
                    <i
                      key={i}
                      className="mm-firefly"
                      style={{ "--i": i, left: `${2 + ((i * 37) % 30)}%`, top: `${30 + ((i * 23) % 55)}%` }}
                    />
                  ))}
                </div>

                <div className="mm-view-toggle mm-view-toggle--stage">{viewToggle}</div>

                <ul className="mm-pins">
                  {SURFACE_MARKERS.map((mk, i) => {
                    const mod = summaries.find((s) => s.slug === mk.slug);
                    const spot = pinSpot(mk, i);
                    const style = { left: spot.x, top: spot.y, width: "max-content", transform: "translate(-50%, -100%)" };

                    if (!mod) {
                      return (
                        <li key={mk.slug} className="mm-pin-slot" style={style}>
                          <div className="mm-pin mm-pin--locked" data-tail={mk.tail}>
                            <span className="mm-pin-ring mm-pin-ring--locked" aria-hidden="true">
                              <Lock size={14} />
                            </span>
                            <span className="mm-pin-text">
                              <span className="mm-pin-title">{mk.title}</span>
                              <span className="mm-pin-meta">Coming soon</span>
                            </span>
                          </div>
                        </li>
                      );
                    }

                    const pct = mod.total ? Math.round((mod.cleared / mod.total) * 100) : 0;
                    const done = mod.total > 0 && mod.cleared >= mod.total;
                    const isCur = mod.slug === current?.slug;
                    const enc = progress?.[mod.slug]?.encounters || [];

                    return (
                      <li key={mk.slug} className="mm-pin-slot" style={style}>
                        <Link
                          href={`/planet/${planetId}/modules/${mod.slug}`}
                          className="mm-pin"
                          data-tail={mk.tail}
                          data-state={done ? "complete" : isCur ? "progress" : "new"}
                          aria-label={`${mod.title}, ${pct}% complete${isCur ? ", continue here" : ""}. ${mk.place}.`}
                        >
                          {isCur && <span className="mm-pin-continue">Continue</span>}
                          <span className="mm-pin-ring">
                            <svg viewBox="0 0 44 44" aria-hidden="true">
                              <circle cx="22" cy="22" r="18" className="mm-ring-track" />
                              <circle
                                cx="22"
                                cy="22"
                                r="18"
                                className="mm-ring-fill"
                                pathLength={100}
                                style={{ strokeDasharray: `${done ? 100 : pct} 100` }}
                              />
                            </svg>
                            {done && (
                              <svg viewBox="0 0 24 24" className="mm-pin-check" aria-hidden="true">
                                <path
                                  d="M6 12.5 10 16.5 18 8"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          <span className="mm-pin-text">
                            <span className="mm-pin-title">{mod.title}</span>
                            <span className="mm-pin-meta">{pct}%</span>
                          </span>
                        </Link>
                        {enc.length > 0 && (
                          <div className="mm-peek" aria-hidden="true">
                            <p className="mm-peek-place">
                              {mk.place} · Module {pad2(mod.order + 1)}
                            </p>
                            <ul>
                              {enc.slice(0, 4).map((e) => (
                                <li key={e.id}>
                                  <span data-status={e.solved ? "cleared" : e.attempts > 0 ? "in-progress" : "not-started"} />
                                  {e.title}
                                </li>
                              ))}
                            </ul>
                            {enc.length > 4 && <p className="mm-peek-more">+{enc.length - 4} more encounters</p>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="mm-list">
                <ol>
                  {SURFACE_MARKERS.map((mk) => {
                    const mod = summaries.find((s) => s.slug === mk.slug);
                    if (!mod) {
                      return (
                        <li key={mk.slug}>
                          <div className="mm-list-row mm-list-row--locked">
                            <span className="mm-pin-ring mm-pin-ring--locked" aria-hidden="true">
                              <Lock size={16} />
                            </span>
                            <span className="mm-list-main">
                              <span className="mm-list-title">{mk.title}</span>
                              <span className="mm-list-sub">{mk.place} · Coming soon</span>
                            </span>
                          </div>
                        </li>
                      );
                    }
                    const pct = mod.total ? Math.round((mod.cleared / mod.total) * 100) : 0;
                    const done = mod.total > 0 && mod.cleared >= mod.total;
                    const isCur = mod.slug === current?.slug;
                    return (
                      <li key={mk.slug}>
                        <Link href={`/planet/${planetId}/modules/${mod.slug}`} className="mm-list-row">
                          <span className="mm-pin-ring" aria-hidden="true">
                            <svg viewBox="0 0 44 44">
                              <circle cx="22" cy="22" r="18" className="mm-ring-track" />
                              <circle
                                cx="22"
                                cy="22"
                                r="18"
                                className="mm-ring-fill"
                                pathLength={100}
                                style={{ strokeDasharray: `${done ? 100 : pct} 100` }}
                              />
                            </svg>
                            {done && (
                              <svg viewBox="0 0 24 24" className="mm-pin-check" aria-hidden="true">
                                <path
                                  d="M6 12.5 10 16.5 18 8"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          <span className="mm-list-main">
                            <span className="mm-list-title">
                              {mod.title}
                              {isCur && <span className="mm-pin-continue mm-pin-continue--inline">Continue</span>}
                            </span>
                            <span className="mm-list-sub">{mod.concepts.slice(0, 4).join(" · ") || mk.place}</span>
                          </span>
                          <span className="mm-list-pct">
                            {mod.cleared}/{mod.total}
                          </span>
                          <ChevronRight size={16} aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
