"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Rocket, Settings, User, Volume2, VolumeX, X } from "lucide-react";
import ApproachScene from "../../art/ApproachScene";
import CockpitFrame from "../../art/CockpitFrame";
import Button from "../../ui/Button";
import HullBar from "../../ui/HullBar";
import Panel from "../../ui/Panel";
import Segmented from "../../ui/Segmented";
import { setSoundEnabled, sfx } from "../../galaxy/audio";
import CodeConsole from "./CodeConsole";
import ResultHost from "../result/ResultHost";
import "./approach.css";

const SETTINGS_KEY = "edoc-galaxy-settings";

const encounterUrl = (planetId, id) => `/planet/${planetId}/encounter/${id}`;

function loadSettings() {
  try {
    return { sound: true, motion: "full", ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {}) };
  } catch {
    return { sound: true, motion: "full" };
  }
}

/**
 * The approach screen: a cockpit view, the obstacle ahead, and a card to take it on.
 * Arrow keys flip between obstacles, Enter engages, Esc goes back. Move the mouse to look around;
 * the rock lights up when you point at it, and clicking it brings the card forward.
 */
export default function ApproachScreen({ planetId, planetName, encounters, hull = 100, start = 0, startEngaged = false }) {
  const router = useRouter();
  const [idx, setIdx] = useState(Math.min(Math.max(start, 0), encounters.length - 1));
  const [settings, setSettings] = useState({ sound: true, motion: "full" });
  const [menu, setMenu] = useState(false);
  const [conceptOpen, setConceptOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [rockHover, setRockHover] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [hullPct, setHullPct] = useState(hull);
  const [engaged, setEngaged] = useState(startEngaged);
  const [diving, setDiving] = useState(false); // Engage pressed: the view pushes in toward the rock before the console opens
  const [leaving, setLeaving] = useState(false); // the console is fading out
  const [warp, setWarp] = useState(0); // counts switches between obstacles, for the flash
  const firstIdx = useRef(true);
  const stepTimer = useRef(null);
  const [done, setDone] = useState(false);
  const [hit, setHit] = useState({ n: 0, k: 0 }); // the last hit on the hull: how many so far, how hard
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef(null);
  const prevHull = useRef(hull);
  const engageRef = useRef(null);
  const pushedRef = useRef(false); // this visit pushed the encounter URL, so closing the console steps back over it
  const backingRef = useRef(false); // our own history.back() is in flight
  const [urlTick, setUrlTick] = useState(0);
  const [outcome, setOutcome] = useState(null); // a result the console has reported: shown as the victory or defeat scene
  const [rematchN, setRematchN] = useState(0);
  const engagedRef = useRef(startEngaged);
  const doneRef = useRef(false);
  const leaveRef = useRef(null);
  const toastTimer = useRef(null);
  const e = encounters[idx];

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setSoundEnabled(s.sound);
  }, []);
  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if ("sound" in patch) setSoundEnabled(next.sound);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch { }
  };

  const say = useCallback((m) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => {
    setConceptOpen(false);
  }, [idx]);

  // the hull number dropping is a hit: flash, shake and sparks all hang off this one change
  useEffect(() => {
    const drop = prevHull.current - hullPct;
    prevHull.current = hullPct;
    if (drop > 0.5) {
      setHit((h) => ({ n: h.n + 1, k: Math.min(1, Math.max(0.35, drop / 30)) }));
      if (settings.motion !== "reduced") {
        clearTimeout(shakeTimer.current);
        setShake(false); // off, then on a frame later, so a second hit shakes again
        requestAnimationFrame(() => requestAnimationFrame(() => setShake(true)));
        shakeTimer.current = setTimeout(() => setShake(false), 560);
      }
    }
  }, [hullPct, settings.motion]);

  useEffect(() => () => clearTimeout(shakeTimer.current), []);

  useEffect(() => {
    if (firstIdx.current) { firstIdx.current = false; return; }
    setWarp((n) => n + 1);
  }, [idx]);

  const goTo = useCallback(
    (n) => {
      if (n < 0 || n >= encounters.length || n === idx) return;
      sfx.tick();
      setIdx(n);
    },
    [encounters.length, idx]
  );
  const back = useCallback(() => router.push("/"), [router]);
  const calmMotion = settings.motion === "reduced";
  const engage = useCallback(() => {
    if (engaged || done || diving) return;
    sfx.select();
    setDiving(true);
    clearTimeout(stepTimer.current);
    stepTimer.current = setTimeout(() => {
      setDiving(false);
      setEngaged(true);
      // the console has its own address, so reload, share and the Back button all land in the right place
      window.history.pushState(null, "", encounterUrl(planetId, encounters[idx]?.id));
      pushedRef.current = true;
    }, calmMotion ? 160 : 650);
  }, [engaged, done, diving, calmMotion, planetId, encounters, idx]);
  // leave the console: fade it out first, then do whatever comes next (next obstacle, the approach card, the docking card)
  const leave = useCallback(
    (after) => {
      if (leaving) return;
      setLeaving(true);
      clearTimeout(stepTimer.current);
      stepTimer.current = setTimeout(() => {
        setEngaged(false);
        setLeaving(false);
        setOutcome(null);
        if (pushedRef.current) {
          pushedRef.current = false;
          backingRef.current = true;
          window.history.back();
        }
        after?.();
      }, calmMotion ? 120 : 280);
    },
    [leaving, calmMotion]
  );

  // The address follows the screen: an obstacle card is /approach?e=N, the console is /encounter/<id>.
  useEffect(() => {
    if (engaged || backingRef.current) return;
    const want = done ? `/planet/${planetId}/approach` : `/planet/${planetId}/approach?e=${idx + 1}`;
    if (window.location.pathname + window.location.search !== want) window.history.replaceState(null, "", want);
  }, [engaged, done, idx, planetId, urlTick]);

  // Browser Back closes the console, Forward reopens it. Our own history.back() above lands here too.
  useEffect(() => {
    const onPop = () => {
      if (backingRef.current) {
        backingRef.current = false;
        setUrlTick((t) => t + 1);
        return;
      }
      const inConsole = window.location.pathname.includes("/encounter/");
      if (!inConsole && engagedRef.current) {
        pushedRef.current = false;
        leaveRef.current?.();
      } else if (inConsole && !engagedRef.current && !doneRef.current) {
        pushedRef.current = true;
        setEngaged(true);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => () => clearTimeout(stepTimer.current), []);
  // an obstacle is cleared: on to the next one, or to docking after the last
  const moveOn = useCallback(
    () =>
      leave(() => {
        if (idx === encounters.length - 1) setDone(true);
        else goTo(idx + 1);
      }),
    [leave, idx, encounters.length, goTo]
  );
  const rematch = useCallback(() => {
    setOutcome(null);
    setHullPct(100);
    setRematchN((n) => n + 1);
  }, []);
  useEffect(() => {
    engagedRef.current = engaged;
    doneRef.current = done;
    leaveRef.current = () => leave();
  });

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.target.closest?.("input, textarea, select, [role=dialog]")) return;
      // While the console is open, only its own controls (Back to obstacle,
      // Rematch) can leave it — no shortcut can skip past a defeat dialog.
      if (engaged || diving || leaving) return;
      if (ev.key === "ArrowLeft") goTo(idx - 1);
      else if (ev.key === "ArrowRight") goTo(idx + 1);
      else if (ev.key === "Escape") {
        if (menu || conceptOpen) { setMenu(false); setConceptOpen(false); }
        else back();
      } else if (ev.key === "Enter" && !ev.target.closest?.("button, a")) engage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, idx, back, engage, menu, conceptOpen, engaged, diving, leaving]);

  useEffect(() => {
    const close = (ev) => {
      if (!ev.target.closest?.(".ap-menu, .ap-settings-btn")) setMenu(false);
      if (!ev.target.closest?.(".ap-concept-pop, .ap-concept")) setConceptOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  if (!e) {
    // an approach with nothing on it yet (a planet whose encounters are still being written)
    return (
      <div className="ap">
        <div className="ap-scene">
          <ApproachScene calm={settings.motion === "reduced"} />
        </div>
        <section className="ap-card" aria-labelledby="ap-title">
          <p className="ap-eyebrow">Clear skies</p>
          <h2 id="ap-title" className="ap-title">No obstacles on this approach yet</h2>
          <p className="ap-blurb">The obstacles for {planetName} are still being written. Check back soon.</p>
          <div className="ap-actions">
            <Button size="lg" onClick={() => router.push("/")}>Back to galaxy</Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`ap ${shake ? "is-hit" : ""} ${diving ? "is-diving" : ""} ${calmMotion ? "is-calm" : ""}`} style={{ "--hit": hit.k }}>
      <div className="ap-scene">
        <ApproachScene
          variant={e.rock}
          calm={settings.motion === "reduced"}
          onHover={(over) => {
            setRockHover(over);
            if (over) sfx.hover();
          }}
          onPick={() => {
            setPulse((p) => p + 1);
            engageRef.current?.focus();
            sfx.select();
          }}
        />
      </div>

      <header className={engaged ? "ap-top is-away" : "ap-top"} aria-hidden={engaged || undefined}>
        <nav className="ap-crumb" aria-label="Where you are">
          <button type="button" className="ap-step" aria-label="Previous obstacle" disabled={idx === 0 || engaged || done} onClick={() => goTo(idx - 1)}>
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <Link href="/" className="ap-crumb-link">
            Galaxy
          </Link>
          <span className="ap-slash" aria-hidden="true">
            /
          </span>
          <h1 className="ap-crumb-now">Approach to {planetName}</h1>
          <button
            type="button"
            className="ap-step"
            aria-label="Next obstacle"
            disabled={idx === encounters.length - 1 || engaged || done}
            onClick={() => goTo(idx + 1)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
        <div className="ap-tools">
          <HullBar value={hullPct} />
          <Button variant="secondary" iconOnly icon={User} aria-label="Open profile" onClick={() => router.push("/profile")} />
          <Button variant="secondary" iconOnly icon={Rocket} aria-label="Back to the galaxy" onClick={back} />
          <Button
            variant="secondary"
            iconOnly
            icon={Settings}
            className="ap-settings-btn"
            aria-label="Settings"
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          />
        </div>
        {menu && (
          <Panel size="sm" className="ap-menu" role="group" aria-label="Settings">
            <div className="ap-menu-row">
              <span>Sound</span>
              <Button variant="ghost" size="sm" icon={settings.sound ? Volume2 : VolumeX} pressed={settings.sound} onClick={() => update({ sound: !settings.sound })}>
                {settings.sound ? "On" : "Off"}
              </Button>
            </div>
            <div className="ap-menu-row">
              <span>Motion</span>
              <Segmented
                label="Motion"
                value={settings.motion}
                onChange={(v) => update({ motion: v })}
                options={[
                  { value: "full", label: "Full" },
                  { value: "reduced", label: "Reduced" }
                ]}
              />
            </div>
          </Panel>
        )}
      </header>

      {done ? (
        <section className="ap-card" aria-labelledby="ap-title">
          <p className="ap-eyebrow">Approach complete</p>
          <h2 id="ap-title" className="ap-title">
            Docking clearance granted
          </h2>
          <p className="ap-blurb">Every obstacle on this approach is cleared. {planetName} is ahead.</p>
          <div className="ap-actions">
            <Button size="lg" onClick={() => router.push(`/planet/${planetId}/landing?hull=${Math.round(hullPct)}`)}>
              Descend to {planetName}
            </Button>
            <Button variant="secondary" size="lg" className="ap-back" onClick={back}>
              Back to galaxy
            </Button>
          </div>
        </section>
      ) : engaged ? (
        <div className={leaving ? "ap-leave" : undefined}>
        <CockpitFrame hull={hullPct} calm={settings.motion === "reduced"} />
        <CodeConsole
          key={`${e.id}-${rematchN}`}
          encounter={e}
          hull={hullPct}
          onHullChange={setHullPct}
          onPass={moveOn}
          onVictory={(r) => setOutcome({ kind: "victory", ...r })}
          onDefeat={(r) => setOutcome({ kind: "defeat", ...r })}
          onExit={() => leave()}
          say={say}
          index={idx}
          total={encounters.length}
          language={planetName}
        />
          <ResultHost
            result={outcome}
            encounter={e}
            nextLabel={idx === encounters.length - 1 ? "Dock" : "Next obstacle"}
            onContinue={moveOn}
            onRematch={rematch}
            muted={!settings.sound}
            calm={calmMotion}
          />
        </div>
      ) : (
        <section key={`${idx}-${pulse}`} className={`ap-card ${rockHover ? "is-lit" : ""} ${pulse ? "is-pulse" : ""}`} aria-labelledby="ap-title" aria-live="polite">
          <p className="ap-eyebrow">Obstacle ahead</p>
          <h2 id="ap-title" className="ap-title">
            {e.title}
          </h2>
          <p className="ap-blurb">{e.blurb}</p>
          <p className="ap-meta">
            Concept:{" "}
            <button type="button" className="ap-concept" aria-expanded={conceptOpen} onClick={() => setConceptOpen((v) => !v)}>
              {e.concept.name}
            </button>{" "}
            · Encounter {idx + 1} of {encounters.length} on approach
          </p>
          {conceptOpen && (
            <div className="ap-concept-pop" role="status">
              <strong>{e.concept.name}.</strong> {e.concept.note}
              <button type="button" className="ap-x" aria-label="Close" onClick={() => setConceptOpen(false)}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="ap-actions">
            <Button ref={engageRef} size="lg" onClick={engage}>
              Engage
            </Button>
            <Button variant="secondary" size="lg" className="ap-back" onClick={back}>
              Back to galaxy
            </Button>
          </div>
          <p className="ap-keys" aria-hidden="true">
            <kbd>←</kbd> <kbd>→</kbd> switch · <kbd>Enter</kbd> engage · <kbd>Esc</kbd> back
          </p>
        </section>
      )}

      {hit.n > 0 && engaged && <div key={hit.n} className={`ap-hit ${settings.motion === "reduced" ? "is-soft" : ""}`} style={{ "--hit": hit.k }} aria-hidden="true" />}

      {diving && <div className="ap-dive" aria-hidden="true" />}
      {warp > 0 && !engaged && !diving && <div key={warp} className="ap-warp" aria-hidden="true" />}

      <div className={`ap-toast ${toast ? "is-on" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
