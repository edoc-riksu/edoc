"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ArtCanvas from "./ArtCanvas";
import { drawBolt } from "./bolt";

/**
 * Bolt's face for the hint panel, as a small animated avatar.
 *
 *   <BoltAvatar state={speaking ? "talking" : "idle"} size={64} />
 *
 * `state` is "idle" (bobs, blinks, eyes follow the pointer), "talking" (voice bars and rings) or "cheer" (smiling eyes).
 * `useBoltState` gives the usual pattern: Bolt talks for a moment whenever something new is revealed, then goes back to idle.
 * With reduced motion (the system setting, or `calm`) it holds still and shows the state with a still pose.
 */
const make = () => ({});

function draw(g, w, h, _data, S) {
  g.clearRect(0, 0, w, h);
  const s = Math.min(w, h) / 92;
  drawBolt(g, w / 2, h * 0.47, s, S.calm ? 0 : S.t, S.calm, {
    look: [S.px, S.py],
    talk: S.state === "talking" ? 1 : 0,
    cheer: S.state === "cheer" ? 1 : 0,
    rgb: S.rgb || "120,245,230"
  });
}

export default function BoltAvatar({ state = "idle", size = 64, calm, rgb, className = "" }) {
  const params = useMemo(() => ({ state, rgb }), [state, rgb]);
  const label = `Bolt, your companion, ${state === "talking" ? "talking" : state === "cheer" ? "cheering" : "listening"}`;
  return (
    <span className={`bolt-avatar ${className}`} style={{ width: size, height: size }}>
      <ArtCanvas make={make} draw={draw} params={params} calmOverride={calm} label={label} />
    </span>
  );
}

/**
 * Bolt's state from what is happening: pass something that changes when he has something to say (the number of hints revealed,
 * say). He talks for `ms` after each change, then is idle again. The first value does not make him talk.
 */
export function useBoltState(trigger, ms = 2600) {
  const [state, setState] = useState("idle");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    setState("talking");
    const id = setTimeout(() => setState("idle"), ms);
    return () => clearTimeout(id);
  }, [trigger, ms]);
  return state;
}
