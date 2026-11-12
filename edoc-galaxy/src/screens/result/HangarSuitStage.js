"use client";

import { useEffect, useRef, useState } from "react";
import SuitScene from "../../art/SuitScene";
import { modelsFor } from "./suitModels";

/**
 * The hangar's own 3D bay (screens/hangar/hangarBayScene.js, used as it is) showing the pilot's explorer on the podium. The
 * explorer starts in the base suit; after `swapAfterMs` the light flashes and they are in the new suit, the Starfarer set.
 * With reduced motion they are in the new suit from the start.
 *
 * The 3D code is loaded only when this mounts, so screens that never show it don't carry it. If it can't start (no WebGL, a
 * model that won't load), the code-drawn SuitScene is shown instead so the panel still has a scene behind it.
 */
export default function HangarSuitStage({ explorerId, calm = false, replay = 0, swapAfterMs = 1500, onSwap, className = "" }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [flash, setFlash] = useState(0);
  const onSwapRef = useRef(onSwap);
  onSwapRef.current = onSwap;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const models = modelsFor(explorerId);
    let api = null;
    let timer = 0;
    let gone = false;
    setFailed(false);
    import("../hangar/hangarBayScene")
      .then(({ createHangarScene }) => {
        if (gone) return;
        const dressed = calm;
        api = createHangarScene(canvas, {
          starfarer: dressed,
          reducedMotion: calm,
          avatarUrl: dressed ? models.starfarer : models.base,
          avatarPreSuited: dressed
        });
        if (!calm) {
          timer = setTimeout(() => {
            api?.setSuit(true);
            api?.setAvatar(models.starfarer, { preSuited: true });
            setFlash((n) => n + 1);
            onSwapRef.current?.();
          }, swapAfterMs);
        }
      })
      .catch(() => {
        if (!gone) setFailed(true);
      });
    return () => {
      gone = true;
      clearTimeout(timer);
      api?.dispose();
    };
  }, [explorerId, calm, replay, swapAfterMs]);

  if (failed) return <SuitScene calm={calm} replay={replay} className={className} />;
  return (
    <>
      <canvas
        ref={canvasRef}
        className={`su-stage ${className}`.trim()}
        role="img"
        aria-label="The hangar bay: your explorer stands on the glow podium and changes into the new suit"
      />
      {flash > 0 && <div key={flash} className="su-flash" aria-hidden="true" />}
    </>
  );
}
