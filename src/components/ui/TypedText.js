"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePilot } from "../../context/PilotContext";

const KEY_MS = 40; // about 25 characters a second

/**
 * ⌨️ TYPED TEXT — types one sentence a character at a time and fires the
 * existing TYPE key-switch voice for every character (spaces stay silent).
 * playSystemSound already respects the Sound toggle. With reduced motion on,
 * the sentence appears at once and no ticks play.
 * Screen readers get the full sentence immediately, never the half-typed one.
 */
export function TypedText({ text, speed = KEY_MS, startDelay = 0, onDone, caret = true, className = "" }) {
  const { playSystemSound } = usePilot();
  const [count, setCount] = useState(0);
  const doneRef = useRef(onDone);
  const soundRef = useRef(playSystemSound);
  doneRef.current = onDone;
  soundRef.current = playSystemSound;

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCount(text.length);
      const t = setTimeout(() => doneRef.current?.(), 0);
      return () => clearTimeout(t);
    }
    setCount(0);
    let i = 0;
    let timer;
    const tick = () => {
      i += 1;
      setCount(i);
      const ch = text[i - 1];
      if (ch && ch !== " ") soundRef.current("TYPE");
      if (i >= text.length) {
        doneRef.current?.();
        return;
      }
      // A little human wobble, plus a breath after punctuation.
      const pause = /[.,!?…]/.test(ch) ? 180 : 0;
      timer = setTimeout(tick, speed * (0.7 + Math.random() * 0.7) + pause);
    };
    timer = setTimeout(tick, startDelay + speed);
    return () => clearTimeout(timer);
  }, [text, speed, startDelay]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      {caret && <span aria-hidden="true" className="typed-caret" />}
    </span>
  );
}

/** Types several sentences one after another; onDone fires after the last. */
export default function TypedLines({ lines, speed = KEY_MS, linePause = 320, onDone, className = "" }) {
  const [shown, setShown] = useState(0);
  const doneRef = useRef(onDone);
  const timerRef = useRef(null);
  doneRef.current = onDone;
  const key = lines.join("|");

  useEffect(() => {
    setShown(0);
    return () => clearTimeout(timerRef.current);
  }, [key]);

  const finishLine = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (shown + 1 >= lines.length) doneRef.current?.();
      else setShown(shown + 1);
    }, linePause);
  };

  return (
    <div className={className}>
      {lines.slice(0, shown).map((line) => (
        <p key={line} className="opacity-70">{line}</p>
      ))}
      {lines[shown] !== undefined && (
        <p key={`${key}:${shown}`}>
          <TypedText text={lines[shown]} speed={speed} onDone={finishLine} />
        </p>
      )}
    </div>
  );
}
