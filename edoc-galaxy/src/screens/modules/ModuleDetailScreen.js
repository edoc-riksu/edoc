"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, CircleDot, Lock, Play, Rocket, UserRound } from "lucide-react";
import AppShell from "../../shell/AppShell";
import Button from "../../ui/Button";
import Panel from "../../ui/Panel";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { conceptFor } from "../../data/concepts";
import ModuleHeroArt from "./ModuleHeroArt";
import "./modules.css";

const DIFFICULTY_DOTS = { easy: 1, medium: 2, hard: 3 };
const TOTAL_DOTS = 4;

function DifficultyDots({ difficulty }) {
  const filled = DIFFICULTY_DOTS[difficulty] || 1;
  return (
    <span className="ml-dots" aria-label={`Difficulty: ${difficulty || "easy"}`}>
      {Array.from({ length: TOTAL_DOTS }, (_, i) => (
        <span key={i} className={`ml-dot ${i < filled ? "is-filled" : ""}`} aria-hidden="true" />
      ))}
    </span>
  );
}

/** The module's own distinct concepts, in first-seen order - no invented copy. */
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

/** A short "what this module teaches" line, built from its own encounters' concepts - no invented copy. */
function descriptionFor(encounters) {
  const names = conceptNamesFor(encounters);
  if (names.length === 0) return "Practice encounters for this module.";
  return `Practice encounters covering ${names.join(", ")}.`;
}

/**
 * Plan Day 30: one module's encounter list, plus a resume card (Day 31)
 * scoped to this module. `locked` on the module is display-only
 * progression (see getModuleLockState's own comment) - every encounter
 * row still links straight to the real encounter, since practice is
 * never locked, module lock or not.
 *
 * Wraps itself in AuthProvider/Suspense/Gate, same convention as
 * hangar/page.js and profile/page.js, since this screen (unlike those)
 * is rendered from an async server page.js that can't itself be a client
 * component.
 */
export default function ModuleDetailScreen({ planetId, planetName, slug }) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <ModuleDetailGate planetId={planetId} planetName={planetName} slug={slug} />
      </Suspense>
    </AuthProvider>
  );
}

function ModuleDetailGate({ planetId, planetName, slug }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState({ status: "loading", module: null, progress: null });

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/signin?returnTo=${encodeURIComponent(`/planet/${planetId}/modules/${slug}`)}`);
    }
  }, [loading, user, router, planetId, slug]);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;

    async function load() {
      const [moduleRes, progressRes] = await Promise.all([
        fetch(`/api/modules/${slug}`, { cache: "no-store" }),
        fetch(`/api/modules/${slug}/progress`, { cache: "no-store" })
      ]);
      if (cancelled) return;
      if (moduleRes.status === 404) {
        setState({ status: "not-found", module: null, progress: null });
        return;
      }
      const moduleData = await moduleRes.json().catch(() => null);
      const progressData = await progressRes.json().catch(() => null);
      if (!cancelled) {
        setState({ status: "ready", module: moduleData?.module || null, progress: progressData?.progress || null });
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [user, slug]);

  if (loading || !user) return null;
  if (state.status === "not-found") notFound();

  const { module: mod, progress } = state;
  const encounterMeta = new Map((progress?.encounters || []).map((e) => [e.id, e]));
  const nextUp = (progress?.encounters || []).find((e) => !e.solved);
  const pct = progress ? Math.round((progress.solvedCount / Math.max(1, progress.totalCount)) * 100) : 0;
  const done = progress && !nextUp && progress.totalCount > 0;
  const ctaTarget = done ? mod?.encounters?.[0] : nextUp;
  const ctaLabel = done
    ? "Replay module"
    : progress?.solvedCount === 0
      ? `Start: Encounter ${(nextUp?.order ?? 0) + 1}`
      : `Continue: Encounter ${(nextUp?.order ?? 0) + 1}`;

  return (
    <AppShell
      section={mod ? mod.title.toUpperCase() : "MODULE"}
      tools={
        <>
          <Button variant="secondary" iconOnly icon={UserRound} href="/profile" aria-label="Open profile" />
          <Button variant="secondary" iconOnly icon={Rocket} href="/" aria-label="Back to the galaxy" />
        </>
      }
    >
      <div className="ml-wrap ml-wrap--detail">
        <nav className="ml-crumb" aria-label="Where you are">
          <Link href="/" className="ml-crumb-link">
            Galaxy
          </Link>
          <span className="ml-slash" aria-hidden="true">
            /
          </span>
          <Link href={`/planet/${planetId}/modules`} className="ml-crumb-link">
            {planetName} modules
          </Link>
          <span className="ml-slash" aria-hidden="true">
            /
          </span>
          <span className="ml-crumb-now">{mod ? mod.title : "…"}</span>
        </nav>

        {!mod || !progress ? (
          <p className="t-body">Loading module…</p>
        ) : (
          <div className="ml-detail-grid">
            <Panel as="section" size="lg" className="ml-hero">
              <div className="ml-hero-art" aria-hidden="true">
                <ModuleHeroArt slug={slug} className="ml-hero-art-canvas" />
                <div className="ml-hero-fade" />
              </div>
              <p className="t-label ml-hero-kicker">Module {mod.order + 1}</p>
              <h1 className="ml-hero-title">{mod.title}</h1>
              <p className="t-body">{descriptionFor(progress.encounters)}</p>
              {conceptNamesFor(progress.encounters).length > 0 && (
                <ul className="ml-concepts" aria-label="Concepts covered">
                  {conceptNamesFor(progress.encounters).map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              {mod.locked && (
                <p className="ml-locked-note">
                  <Lock size={13} aria-hidden="true" /> Shown as locked until the module before it is finished — every encounter here is
                  still playable right now.
                </p>
              )}
              <div className="ml-progress">
                <p className="ml-hero-stats t-small t-muted">
                  <strong>{progress.solvedCount}</strong> of {progress.totalCount} encounters cleared
                  <span className="ml-percent">{pct}%</span>
                </p>
                <div
                  className="ml-segments"
                  role="progressbar"
                  aria-valuenow={progress.solvedCount}
                  aria-valuemin={0}
                  aria-valuemax={progress.totalCount}
                  aria-label={`${progress.solvedCount} of ${progress.totalCount} encounters cleared`}
                >
                  {progress.encounters.map((e) => (
                    <span
                      key={e.id}
                      className="ml-seg"
                      data-status={e.solved ? "cleared" : e.attempts > 0 ? "in-progress" : "not-started"}
                    />
                  ))}
                </div>
              </div>
              {nextUp && (
                <div className="ml-nextup">
                  <span className="ml-nextup-label">Next up</span>
                  <span className="ml-nextup-title">
                    <span className="ml-nextup-num">{String(nextUp.order + 1).padStart(2, "0")}</span> {nextUp.title}
                  </span>
                  <span className="ml-tag">{conceptFor(nextUp.concepts?.[0]).name}</span>
                </div>
              )}
              {ctaTarget && (
                <Button className="ml-hero-resume" icon={Play} href={`/planet/${planetId}/encounter/${ctaTarget.id}`}>
                  {ctaLabel}
                </Button>
              )}
              <Link href={`/planet/${planetId}/modules`} className="ml-hero-secondary">
                All {planetName} modules
              </Link>
            </Panel>

            <Panel as="section" size="lg" title="Encounters" className="ml-enc-panel">
              {mod.encounters.length === 0 ? (
                <p className="t-body">No encounters in this module yet.</p>
              ) : (
                <ol className="ml-enc-list">
                  {mod.encounters.map((e) => {
                    const meta = encounterMeta.get(e.id);
                    const solved = meta?.solved || false;
                    const attempts = meta?.attempts || 0;
                    const inProgress = !solved && attempts > 0;
                    const isNextUp = nextUp?.id === e.id;
                    const StatusIcon = solved ? CheckCircle2 : inProgress ? CircleDot : Circle;
                    const statusText = solved ? "Cleared" : inProgress ? `In progress · attempt ${attempts}` : "Not started";
                    return (
                      <li key={e.id}>
                        <div className={`ml-enc-row ${solved ? "is-solved" : ""} ${isNextUp ? "is-current" : ""}`}>
                          <StatusIcon size={18} aria-hidden="true" className={`ml-enc-status ${solved ? "is-solved" : inProgress ? "is-progress" : ""}`} />
                          <span className="ml-enc-order">{String(e.order + 1).padStart(2, "0")}</span>
                          <span className="ml-enc-main">
                            <span className="ml-enc-title">
                              {e.title}
                              <span className="ml-tag">{conceptFor(e.concepts?.[0]).name}</span>
                            </span>
                            <span className={`t-small t-muted ml-enc-statustext ${solved ? "is-solved" : inProgress ? "is-progress" : ""}`}>
                              {statusText}
                            </span>
                          </span>
                          <DifficultyDots difficulty={e.difficulty} />
                          <Button
                            variant={isNextUp ? "primary" : "secondary"}
                            size="sm"
                            iconOnly
                            icon={Play}
                            href={`/planet/${planetId}/encounter/${e.id}`}
                            aria-label={`Play ${e.title}`}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>
          </div>
        )}
      </div>
    </AppShell>
  );
}
