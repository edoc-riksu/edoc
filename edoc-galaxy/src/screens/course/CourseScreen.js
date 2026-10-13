"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import FlightScene from "../../art/FlightScene";
import Button from "../../ui/Button";
import { setSoundEnabled, sfx } from "../../galaxy/audio";
import "./course.css";

const SETTINGS_KEY = "edoc-galaxy-settings";
const DURATION = 7.5; // seconds for the whole journey

/**
 * "Setting course for Python…": the ship flies toward the planet while three short captions go by.
 * Esc, Enter or Skip goes straight to the approach screen. Click the scene or press Space for the next caption.
 * With reduced motion on it shows one still picture and waits for you to continue.
 */
export default function CourseScreen({ planetId, captions, next }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  const left = useRef(false);

  const go = useCallback(() => {
    if (left.current) return;
    left.current = true;
    router.replace(next);
  }, [router, next]);

  // sound follows the galaxy settings; on by default
  useEffect(() => {
    let motion = "full";
    try {
      const s = { sound: true, motion: "full", ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {}) };
      setSoundEnabled(s.sound);
      motion = s.motion;
    } catch {}
    const calm = motion === "reduced" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setReduced(calm);
    sfx.launch();
    if (calm) return undefined;
    const per = (DURATION * 1000) / captions.length;
    const timers = captions.map((_, i) => (i === 0 ? null : setTimeout(() => { sfx.tick(); setStep(i); }, per * i))).filter(Boolean);
    timers.push(setTimeout(go, DURATION * 1000));
    return () => timers.forEach(clearTimeout);
  }, [captions, go]);

  const advance = useCallback(() => {
    if (step >= captions.length - 1) go();
    else {
      sfx.tick();
      setStep((s) => s + 1);
    }
  }, [step, captions.length, go]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === "Escape" || ev.key === "Enter") go();
      else if (ev.key === " " || ev.key === "ArrowRight") {
        ev.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, advance]);

  return (
    <div className="cs">
      <div className="cs-stage">
        <FlightScene duration={DURATION} calm={reduced} onPick={advance} />
        <div className="cs-caption" role="status" aria-live="polite">
          <p key={step}>{captions[step]}</p>
        </div>
      </div>
      <ol className="cs-dots" aria-label={`Step ${step + 1} of ${captions.length}`}>
        {captions.map((c, i) => (
          <li key={c} className={i === step ? "is-on" : i < step ? "is-done" : ""} />
        ))}
      </ol>
      <Button variant="secondary" className="cs-skip" onClick={go} aria-label={reduced ? "Continue" : "Skip, to the approach"}>
        {reduced ? "Continue" : "Skip"}
        {!reduced && <kbd>Esc</kbd>}
        <ChevronRight size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
