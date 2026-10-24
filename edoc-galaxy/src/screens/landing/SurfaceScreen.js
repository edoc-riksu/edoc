"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import SurfaceScene from "../../art/SurfaceScene";
import Button from "../../ui/Button";
import HullBar from "../../ui/HullBar";
import { severityFor } from "../../art/lander";
import { setSoundEnabled, sfx } from "../../galaxy/audio";
import "../approach/approach.css";
import "./landing.css";

const SETTINGS_KEY = "edoc-galaxy-settings";

const WORDS = [
  { eyebrow: "Touchdown", title: (n) => `Welcome to ${n}`, blurb: (n) => `A smooth landing. The ship is in one piece, and ${n} is waiting outside.`, ship: "Ship in good shape." },
  { eyebrow: "Hard landing", title: (n) => `Down on ${n}`, blurb: (n) => `The ship skidded and took a beating, but you are on the ground at ${n}.`, ship: "Scorched, but it holds." },
  { eyebrow: "Crash landing", title: (n) => `Crashed on ${n}`, blurb: () => "The ship is wrecked and still smoking. You made it down alive.", ship: "Badly damaged." }
];

/** The planet's surface after landing: the ship where it came down, and a card to carry on from. */
export default function SurfaceScreen({ planetId, planetName, hull }) {
  const router = useRouter();
  const sev = severityFor(hull);
  const w = WORDS[sev];
  const [reduced, setReduced] = useState(false);
  const [lit, setLit] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    try {
      const s = { sound: true, motion: "full", ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {}) };
      setSoundEnabled(s.sound);
      setReduced(s.motion === "reduced");
    } catch {}
  }, []);

  const say = useCallback((m) => {
    setToast(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2800);
  }, []);
  const back = useCallback(() => router.push("/"), [router]);
  const out = useCallback(() => {
    sfx.select();
    say("Exploring the surface isn't connected yet. It comes with a later build.");
  }, [say]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.target.closest?.("input, textarea, select, [role=dialog]")) return;
      if (ev.key === "Escape") back();
      else if (ev.key === "Enter" && !ev.target.closest?.("button, a")) out();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, out]);

  return (
    <div className="ap sf">
      <div className="ap-scene">
        <SurfaceScene severity={sev} calm={reduced} onHover={(o) => { setLit(o); if (o) sfx.hover(); }} onPick={() => { sfx.select(); say(`${w.ship} Hull at ${Math.round(hull)}%.`); }} />
      </div>

      <header className="ap-top">
        <nav className="ap-crumb" aria-label="Where you are">
          <Link href="/" className="ap-crumb-link">Galaxy</Link>
          <span className="ap-slash" aria-hidden="true">/</span>
          <h1 className="ap-crumb-now">{planetName} surface</h1>
        </nav>
        <div className="ap-tools">
          <HullBar value={hull} />
          <Button variant="secondary" iconOnly icon={User} aria-label="Open profile" onClick={() => router.push("/profile")} />
        </div>
      </header>

      <section className={`ap-card ${lit ? "is-lit" : ""} ${sev > 0 ? "is-bad" : ""}`} aria-labelledby="sf-title">
        <p className="ap-eyebrow">{lit ? "Your ship" : w.eyebrow}</p>
        <h2 id="sf-title" className="ap-title">{lit ? w.ship : w.title(planetName)}</h2>
        <p className="ap-blurb">{lit ? `Hull at ${Math.round(hull)}%.` : w.blurb(planetName)}</p>
        <div className="ap-actions">
          <Button size="lg" onClick={out}>Step outside</Button>
          <Button variant="secondary" size="lg" className="ap-back" onClick={back}>Back to galaxy</Button>
        </div>
        <p className="ap-keys" aria-hidden="true">Point at your ship to look it over · <kbd>Enter</kbd> step outside · <kbd>Esc</kbd> back</p>
      </section>

      <div className={`ap-toast ${toast ? "is-on" : ""}`} role="status">{toast}</div>
    </div>
  );
}
