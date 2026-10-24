"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import LandingScene from "../../art/LandingScene";
import Button from "../../ui/Button";
import { severityFor } from "../../art/lander";
import { setSoundEnabled, sfx } from "../../galaxy/audio";
import "./landing.css";

const SETTINGS_KEY = "edoc-galaxy-settings";
const DURATION = 9; // seconds, start to finish
const TOUCHDOWN = [0.8, 0.78, 0.76]; // when the ship meets the ground, as a share of the whole

// What the pilot hears and reads on the way down. Three beats: the atmosphere, the trouble (or the calm), the landing.
const CAPTIONS = [
  ["Entering the atmosphere.", "Easy does it. Steady descent.", "Touchdown. A smooth landing."],
  ["Entering the atmosphere.", "The hull is hurt. Controls are heavy.", "Hard landing. Brace!"],
  ["Entering the atmosphere.", "Hull breach. Systems failing.", "Crash landing. Brace for impact!"]
];

/**
 * Down to the surface. How rough the landing is depends on the hull the pilot arrives with: 70 and up is smooth,
 * 35 to 69 is rough, below 35 is a crash. Esc or Enter skips it. With reduced motion it plays the same descent without shaking, flashing or flicker.
 */
export default function LandingScreen({ planetId, hull, next }) {
  const router = useRouter();
  const sev = severityFor(hull);
  const [beat, setBeat] = useState(0);
  const [soft, setSoft] = useState(false); // the system or the app asks for reduced motion: play the descent gently
  const [ready, setReady] = useState(false); // the scene is built and its clock is running
  const left = useRef(false);

  const go = useCallback(() => {
    if (left.current) return;
    left.current = true;
    router.replace(next);
  }, [router, next]);

  useEffect(() => {
    let motion = "full";
    try {
      const s = { sound: true, motion: "full", ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {}) };
      setSoundEnabled(s.sound);
      motion = s.motion;
    } catch {}
    const calm = motion === "reduced" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setSoft(calm);
    if (!ready) return undefined; // building the scene takes a moment; the sound, captions and the bar wait for it
    sfx.launch();
    const at = (p) => p * DURATION * 1000;
    const timers = [
      setTimeout(() => { sfx.tick(); setBeat(1); }, at(0.34)),
      setTimeout(() => {
        setBeat(2);
        if (sev === 0) sfx.arrive();
        else sfx.denied();
      }, at(TOUCHDOWN[sev] - 0.04)),
      setTimeout(go, DURATION * 1000)
    ];
    return () => timers.forEach(clearTimeout);
  }, [go, sev, ready]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === "Escape" || ev.key === "Enter") go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="ld">
      <div className="ld-stage">
        <LandingScene severity={sev} duration={DURATION} soft={soft} onPick={() => {}} onReady={() => setReady(true)} />
      </div>
      {ready && <div className="ld-bar" style={{ animationDuration: `${DURATION}s` }} aria-hidden="true" />}
      {!ready && <p className="ld-wait" aria-hidden="true">Preparing the descent</p>}
      <div className={`ld-caption ${sev > 0 && beat > 0 ? "is-bad" : ""}`} role="status" aria-live="polite">
        <p key={beat}>{CAPTIONS[sev][beat]}</p>
      </div>
      <Button variant="secondary" className="ld-skip" onClick={go} aria-label="Skip the landing">
        Skip landing
        <kbd>Esc</kbd>
        <ChevronRight size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
