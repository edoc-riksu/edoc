"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Rocket, UserRound } from "lucide-react";
import AppShell from "../../shell/AppShell";
import Button from "../../ui/Button";
import ProgressRing from "../../ui/ProgressRing";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { conceptFor } from "../../data/concepts";
import { findContinueTarget } from "../../lib/moduleResume";
import ModuleBadge from "./ModuleBadge";
import "./modules.css";

/** Up to 3 of a module's own concepts, as a short "what you'll practice" line. */
function subtitleFor(encounters) {
  const seen = new Set();
  const names = [];
  for (const e of encounters || []) {
    for (const c of e.concepts || []) {
      if (seen.has(c)) continue;
      seen.add(c);
      names.push(conceptFor(c).name);
      if (names.length === 3) return names.join(", ");
    }
  }
  return names.join(", ");
}

/**
 * Plan Day 29: the module list for one planet. Each card is the module's
 * entry point into Day 30's encounter list (the module detail screen).
 * `locked` is display-only progression (see getModuleLockState's own
 * comment) - every card still links through, since practice is never
 * locked.
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

  const continueTarget = progress && findContinueTarget(Object.values(progress).filter(Boolean));
  const stats = modules && progress && {
    moduleCount: modules.length,
    solved: Object.values(progress).reduce((sum, p) => sum + (p?.solvedCount || 0), 0),
    total: Object.values(progress).reduce((sum, p) => sum + (p?.totalCount || 0), 0)
  };

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
      <div className="ml-wrap">
        <nav className="ml-crumb" aria-label="Where you are">
          <Link href="/" className="ml-crumb-link">
            Galaxy
          </Link>
          <span className="ml-slash" aria-hidden="true">
            /
          </span>
          <span className="ml-crumb-now">{planetName} modules</span>
        </nav>

        <header className="ml-header">
          <h1 className="ml-title">{planetName} modules</h1>
          <p className="ml-subtitle">Practice is always open. Pick any module.</p>
          {stats && (
            <p className="ml-stats">
              <span>
                <strong>{stats.moduleCount}</strong> module{stats.moduleCount === 1 ? "" : "s"}
              </span>
              <span className="ml-stats-dot" aria-hidden="true" />
              <span>
                <strong>{stats.solved}</strong> of {stats.total} encounters cleared
              </span>
            </p>
          )}
        </header>

        {modules === null ? (
          <p className="t-body">Loading modules…</p>
        ) : modules.length === 0 ? (
          <p className="t-body">No modules yet for {planetName}.</p>
        ) : (
          <ul className="ml-list">
            {modules.map((m) => {
              const p = progress?.[m.slug];
              const pct = p ? Math.round((p.solvedCount / p.totalCount) * 100) : 0;
              const isContinueModule = continueTarget?.moduleSlug === m.slug;
              return (
                <li key={m.slug} className="ml-card-wrap">
                  <Link
                    href={`/planet/${planetId}/modules/${m.slug}`}
                    className="ml-card-overlay"
                    aria-label={`Open ${m.title} module`}
                  />
                  <div className={`ml-card ${m.locked ? "is-locked" : ""} ${p?.complete ? "is-complete" : ""}`}>
                    <div className="ml-card-icon" aria-hidden="true">
                      <ModuleBadge slug={m.slug} className="ml-card-icon-canvas" />
                    </div>
                    <ProgressRing value={pct} complete={!!p?.complete} size={44} />
                    <div className="ml-card-body">
                      <h2 className="ml-card-title">{m.title}</h2>
                      <p className="ml-card-sub t-small t-muted">{p ? subtitleFor(p.encounters) : `${m.encounterCount} encounters`}</p>
                    </div>
                    {isContinueModule && (
                      <Button size="sm" className="ml-card-continue" href={`/planet/${planetId}/encounter/${continueTarget.encounterId}`}>
                        Continue
                      </Button>
                    )}
                    <span className="ml-card-count">{p ? `${p.solvedCount} of ${p.totalCount}` : `0 of ${m.encounterCount}`}</span>
                    <ChevronRight size={18} className="ml-card-chevron" aria-hidden="true" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
