"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Paints one of the code-made scenes in src/art onto a canvas that fills its parent.
 *
 * - `make()` builds the scene once; `draw(ctx, w, h, data, S)` paints a frame from the state object S.
 * - S carries `t` (seconds), `calm` (reduced motion), `px`/`py` (eased pointer, -1..1) and `hover` (0..1),
 *   plus anything you pass in `params`, which is merged in on every frame.
 * - `hit(S, x, y)` says whether a canvas point is on the interactive thing; `onPick` fires on click, `onHover` on enter and leave.
 * - With reduced motion on, it paints still frames only (on resize and when params change).
 * - `ignoreMotionPref` keeps animating even when the system asks for reduced motion (the scene must then tone itself down, see S.soft).
 * - `loadingLabel` shows that text over the canvas until the scene is built (use it together with `defer`). If the scene can't be
 *   built or drawn, a short notice replaces the canvas so the rest of the screen still works.
 * - `defer` builds the scene a moment after mount, so the page around it can paint first (building a big scene blocks the
 *   main thread). `onReady` fires once the first frame is queued; its time zero is the scene's time zero.
 */
export default function ArtCanvas({ make, draw, label, className = "", params, hit, onPick, onHover, calmOverride, defer = false, onReady, ignoreMotionPref = false, loadingLabel }) {
  const ref = useRef(null);
  const live = useRef({ params, onPick, onHover, calmOverride, onReady });
  live.current = { params, onPick, onHover, calmOverride, onReady };
  const api = useRef({ redraw: () => {} });
  const [ready, setReady] = useState(!loadingLabel);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.current.redraw();
  }, [params, calmOverride]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    if (!defer) return boot(canvas);
    let off;
    const id = setTimeout(() => { off = boot(canvas); }, 60);
    return () => { clearTimeout(id); off?.(); };
  }, [make, draw, hit, defer, ignoreMotionPref]);

  function boot(canvas) {
    const ctx = canvas.getContext("2d");
    let data;
    try {
      data = make();
    } catch (err) {
      console.error("Scene could not be built", err);
      setFailed(true);
      return undefined;
    }
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    const S = { t: 0, calm: false, px: 0, py: 0, hover: 0, lockT: 0, dpr: 1, frame: 0 };
    let tx = 0, ty = 0, ht = 0, hovering = false;
    let raf = 0, w = 0, h = 0, failedRef = false;
    // Resolution adapts to the machine: if frames take too long the canvas drops to fewer pixels (softer, but smooth).
    let scale = Math.min(2, window.devicePixelRatio || 1), lastNow = 0, slow = 0, frames = 0;
    const t0 = performance.now();

    const isCalm = () => (!ignoreMotionPref && !!mq?.matches) || !!live.current.calmOverride;
    const size = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      const dpr = scale;
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paint = (now) => {
      S.calm = isCalm();
      S.dpr = scale;
      S.frame += 1;
      S.t = Math.max(0, (now - t0) / 1000); // the first frame's timestamp can be a hair before t0
      Object.assign(S, live.current.params);
      if (S.calm) { S.px = 0; S.py = 0; S.hover = ht; }
      else {
        S.px += (tx - S.px) * 0.07;
        S.py += (ty - S.py) * 0.07;
        S.hover += (ht - S.hover) * 0.16;
      }
      try {
        draw(ctx, w, h, data, S);
      } catch (err) {
        console.error("Scene could not be drawn", err);
        failedRef = true;
        setFailed(true);
      }
    };
    const tune = (now) => {
      const dt = now - lastNow;
      lastNow = now;
      if (document.hidden || dt <= 0 || dt > 250) { frames = 0; slow = 0; return; } // a tab in the background or a hiccup says nothing about speed
      frames += 1;
      slow += dt;
      if (frames >= 24) {
        if (slow / frames > 27 && scale > 0.6) { // under about 37 frames a second
          scale = Math.max(0.6, scale * 0.8);
          size();
        }
        frames = 0;
        slow = 0;
      }
    };
    const loop = (now) => {
      if (!isCalm()) tune(now);
      paint(now);
      if (failedRef) return;
      if (!S.calm) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const redraw = () => {
      cancelAnimationFrame(raf);
      if (!w) size();
      raf = requestAnimationFrame(loop);
    };
    api.current.redraw = redraw;
    size();
    redraw();
    live.current.onReady?.();
    setReady(true);

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      tx = clampN(((x / r.width) - 0.5) * 2);
      ty = clampN(((y / r.height) - 0.5) * 2);
      const over = !!hit && e.target === canvas && hit(S, x, y);
      ht = over ? 1 : 0;
      canvas.style.cursor = over ? "pointer" : "default";
      if (over !== hovering) {
        hovering = over;
        live.current.onHover?.(over);
      }
      if (S.calm) redraw();
    };
    const onLeave = () => {
      tx = ty = 0; ht = 0;
      if (hovering) { hovering = false; live.current.onHover?.(false); }
    };
    const onClick = (e) => {
      const r = canvas.getBoundingClientRect();
      if (hit && hit(S, e.clientX - r.left, e.clientY - r.top)) live.current.onPick?.(S);
    };
    const ro = new ResizeObserver(() => { size(); redraw(); });
    ro.observe(canvas.parentElement);
    const onMq = () => redraw();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", onClick);
    mq?.addEventListener?.("change", onMq);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("click", onClick);
      mq?.removeEventListener?.("change", onMq);
    };
  }

  return (
    <>
      <canvas ref={ref} className={className} role="img" aria-label={label} hidden={failed} />
      {!ready && !failed && (
        <div className="art-loading" role="status">
          <span>{loadingLabel}</span>
        </div>
      )}
      {failed && (
        <div className="art-loading is-failed" role="status">
          <span>This view could not load. Everything else on the screen still works.</span>
        </div>
      )}
    </>
  );
}

const clampN = (v) => Math.max(-1, Math.min(1, v));
