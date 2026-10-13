"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Rocket, Settings, User, Volume2, VolumeX, X } from "lucide-react";
import ApproachScene from "../../art/ApproachScene";
import Button from "../../ui/Button";
import HullBar from "../../ui/HullBar";
import Panel from "../../ui/Panel";
import Segmented from "../../ui/Segmented";
import { setSoundEnabled, sfx } from "../../galaxy/audio";
import "./approach.css";

const SETTINGS_KEY = "edoc-galaxy-settings";

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
export default function ApproachScreen({ planetId, planetName, encounters, hull = 100, start = 0 }) {
  const router = useRouter();
  const [idx, setIdx] = useState(Math.min(Math.max(start, 0), encounters.length - 1));
  const [settings, setSettings] = useState({ sound: true, motion: "full" });
  const [menu, setMenu] = useState(false);
  const [conceptOpen, setConceptOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [rockHover, setRockHover] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [engaging, setEngaging] = useState(false);
  const engageRef = useRef(null);
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
    } catch {}
  };

  const say = useCallback((m) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => {
    setConceptOpen(false);
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
  const engage = useCallback(() => {
    if (engaging) return;
    sfx.select();
    setEngaging(true);
    say("The code console isn't connected to this screen yet.");
    setTimeout(() => setEngaging(false), 900);
  }, [engaging, say]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.target.closest?.("input, textarea, select, [role=dialog]")) return;
      if (ev.key === "ArrowLeft") goTo(idx - 1);
      else if (ev.key === "ArrowRight") goTo(idx + 1);
      else if (ev.key === "Escape") {
        if (menu || conceptOpen) { setMenu(false); setConceptOpen(false); }
        else back();
      } else if (ev.key === "Enter" && !ev.target.closest?.("button, a")) engage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, idx, back, engage, menu, conceptOpen]);

  useEffect(() => {
    const close = (ev) => {
      if (!ev.target.closest?.(".ap-menu, .ap-settings-btn")) setMenu(false);
      if (!ev.target.closest?.(".ap-concept-pop, .ap-concept")) setConceptOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div className="ap">
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

      <header className="ap-top">
        <nav className="ap-crumb" aria-label="Where you are">
          <button type="button" className="ap-step" aria-label="Previous obstacle" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <Link href="/" className="ap-crumb-link">
            Galaxy
          </Link>
          <span className="ap-slash" aria-hidden="true">
            /
          </span>
          <h1 className="ap-crumb-now">Approach to {planetName}</h1>
          <button type="button" className="ap-step" aria-label="Next obstacle" disabled={idx === encounters.length - 1} onClick={() => goTo(idx + 1)}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
        <div className="ap-tools">
          <HullBar value={hull} />
          <Button variant="secondary" iconOnly icon={User} aria-label="Pilot profile" onClick={() => say("Pilot profile isn't part of this build yet.")} />
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
          <Button ref={engageRef} size="lg" loading={engaging} onClick={engage}>
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

      <div className={`ap-toast ${toast ? "is-on" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
