"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Rocket, Settings, User, Volume2, VolumeX, X } from "lucide-react";
import { PLANETS, UNCHARTED, makeFrame, sampleRoute, ROUTE_D_MIN, ROUTE_D_MAX } from "./layout";
import { Sky } from "./sky";
import { ShipSystem } from "./ships";
import { Hero } from "./hero";
import { makeSkins, drawPlanet } from "./planet";
import { setSoundEnabled, sfx } from "./audio";

const N = PLANETS.length;
const BOX = 250; // css size of a planet's box; the planet itself is 80% of it (radius 100 at scale 1)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const DEFAULTS = { motion: "full", stars: "normal", ships: true, sound: true };
const DENSITY = { low: 0.5, normal: 1, high: 1.6 };

function sparkle(ctx, x, y, r, t) {
  const k = 0.72 + 0.28 * Math.sin(t * 1.7);
  const R = r * k;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.2);
  g.addColorStop(0, "rgba(200,230,255,0.35)");
  g.addColorStop(1, "rgba(200,230,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - R * 2.2, y - R * 2.2, R * 4.4, R * 4.4);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.6) * 0.12);
  ctx.fillStyle = "rgba(240,248,255,0.95)";
  ctx.beginPath();
  ctx.moveTo(0, -R);
  ctx.quadraticCurveTo(0, 0, R * 0.62, 0);
  ctx.quadraticCurveTo(0, 0, 0, R);
  ctx.quadraticCurveTo(0, 0, -R * 0.62, 0);
  ctx.quadraticCurveTo(0, 0, 0, -R);
  ctx.fill();
  ctx.restore();
}

function RingedBadge() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" className="gx-badge-ico">
      <ellipse cx="10" cy="10" rx="9" ry="3.2" transform="rotate(-24 10 10)" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.8" />
      <circle cx="10" cy="10" r="4.6" fill="currentColor" />
      <path d="M2.4 12.2c2.6 1.7 11.6-.4 15.2-4.4" fill="none" stroke="rgba(8,14,34,0.85)" strokeWidth="1.1" />
    </svg>
  );
}

export default function Galaxy() {
  const rootRef = useRef(null);
  const skyRef = useRef(null);
  const fxRef = useRef(null);
  const cardRef = useRef(null);
  const tipRef = useRef(null);
  const boxRefs = useRef([]);
  const canvasRefs = useRef([]);
  const labelRefs = useRef([]);
  const S = useRef(null);
  if (S.current === null) {
    S.current = {
      u: -0.9,
      uVel: 0,
      target: 0,
      anchor: 0,
      sel: 0,
      hover: -1,
      flying: false,
      arrived: false,
      pendingFly: null,
      wheelActive: false,
      wheelTimer: 0,
      drag: null,
      suppressClick: false,
      ptrT: { x: 0, y: 0 },
      ptr: { x: 0, y: 0 },
      mouse: { x: -999, y: -999, lastSpark: { x: 0, y: 0 } },
      ripples: [],
      px: new Array(N).fill(0),
      py: new Array(N).fill(0),
      pr: new Array(N).fill(1),
      settings: DEFAULTS,
      zoom: 1,
      w: 0,
      h: 0
    };
  }

  const [sel, setSel] = useState(0);
  const [hover, setHover] = useState(-1);
  const [portrait, setPortrait] = useState(false);
  const [flying, setFlying] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [touched, setTouched] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(0);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  /* ---------- selection ---------- */
  const select = useCallback((i, quiet) => {
    const s = S.current;
    const idx = clamp(i, 0, N - 1);
    s.target = idx;
    s.anchor = idx;
    if (idx !== s.sel) {
      s.sel = idx;
      setSel(idx);
      if (!quiet) sfx.select();
    }
  }, []);

  const settle = useCallback(() => {
    const s = S.current;
    s.wheelActive = false;
    const delta = s.target - s.anchor;
    const steps = Math.abs(delta) < 0.12 ? 0 : Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta)));
    select(s.anchor + steps);
  }, [select]);

  const startFly = useCallback(
    (index) => {
      const s = S.current;
      if (s.flying || s.arrived) return;
      const p = PLANETS[index];
      if (!p.name) {
        sfx.denied();
        showToast("That world is still out of range.");
        return;
      }
      if (index !== s.sel || Math.abs(s.u - index) > 0.03) {
        select(index);
        s.pendingFly = index;
        return;
      }
      s.pendingFly = null;
      s.flying = true;
      setFlying(true);
      setMenuOpen(false);
      sfx.launch();
      s.hero.launch(
        () => ({ x: s.px[index], y: s.py[index] }),
        () => {
          sfx.arrive();
          s.arrived = true;
          setArrived(true);
        }
      );
      if (s.settings.motion === "reduced") s.hero.flight.dur = 0.9;
    },
    [select, showToast]
  );

  const landBack = () => {
    const s = S.current;
    s.arrived = false;
    s.flying = false;
    setArrived(false);
    setFlying(false);
    s.hero.comeBack(s.px[s.sel], s.py[s.sel]);
    sfx.select();
  };

  /* ---------- settings: load, save, apply ---------- */
  useEffect(() => {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem("edoc-galaxy-settings") || "null");
    } catch {}
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSettings({ ...DEFAULTS, ...(reduce ? { motion: "reduced" } : {}), ...(saved || {}) });
  }, []);

  useEffect(() => {
    const s = S.current;
    const prevStars = s.settings.stars;
    s.settings = settings;
    setSoundEnabled(settings.sound);
    if (prevStars !== settings.stars) s.layout?.();
    try {
      localStorage.setItem("edoc-galaxy-settings", JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const update = (patch) => setSettings((v) => ({ ...v, ...patch }));

  /* ---------- the engine ---------- */
  useEffect(() => {
    const s = S.current;
    const root = rootRef.current;
    const sky = new Sky(skyRef.current);
    const fx = fxRef.current;
    const fctx = fx.getContext("2d");
    const ships = new ShipSystem();
    const hero = new Hero();
    s.hero = hero;
    const skins = makeSkins();
    const pctx = canvasRefs.current.map((c) => c.getContext("2d"));
    const pinfo = PLANETS.map(() => ({ B: 0, last: -1, key: "" }));
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const tmp = { x: 0, y: 0, r: 0 };
    const tmp0 = { x: 0, y: 0, r: 0 };

    function layout() {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = w;
      s.h = h;
      s.dpr = dpr;
      const f = makeFrame(w, h);
      s.frame = f;
      sky.resize(w, h, dpr, DENSITY[s.settings.stars] ?? 1);
      fx.width = Math.round(w * dpr);
      fx.height = Math.round(h * dpr);

      // the fixed route line, in screen pixels
      const pts = [];
      for (let d = ROUTE_D_MIN; d <= ROUTE_D_MAX + 0.001; d += 0.2) {
        sampleRoute(f.table, d, tmp);
        pts.push({ x: f.fx + tmp.x * f.s, y: f.fy + tmp.y * f.s });
      }
      s.route = pts;

      // one step along the route, in pixels (used for drag and star parallax)
      sampleRoute(f.table, 1, tmp);
      sampleRoute(f.table, 0, tmp0);
      s.vec = { x: (tmp.x - tmp0.x) * f.s, y: (tmp.y - tmp0.y) * f.s };

      hero.setHome(f.portrait ? w * 0.82 : w * 0.78, f.portrait ? h * 0.2 : h * 0.83, (f.portrait ? 74 : 112) * f.s);
      hero.home.x = f.portrait ? w * 0.82 : w * 0.78;
      hero.home.y = f.portrait ? h * 0.2 : h * 0.83;
      hero.size = (f.portrait ? 74 : 112) * f.s;

      const card = cardRef.current;
      if (card) {
        if (f.portrait) {
          card.style.left = "";
          card.style.top = "";
          card.style.width = "";
        } else {
          const cw = clamp(Math.round(282 * clamp(f.s, 0.82, 1.15)), 220, 330);
          const left = Math.min(f.fx + 75 * f.s + 52 * f.s, w - cw - 16);
          card.style.width = `${cw}px`;
          card.style.left = `${Math.round(left)}px`;
          card.style.top = `${Math.round(f.fy - 26 * f.s)}px`;
        }
      }
      setPortrait(f.portrait);
    }
    s.layout = layout;
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(root);

    /* ----- input ----- */
    const onWheel = (e) => {
      if (e.target.closest?.("[data-nowheel]")) return;
      e.preventDefault();
      if (s.flying || s.arrived) return;
      let dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= 400;
      if (!s.wheelActive) {
        s.wheelActive = true;
        s.anchor = s.sel;
        s.target = s.sel;
      }
      s.target = clamp(s.target + dy * 0.0035, -0.3, N - 1 + 0.3);
      setTouched(true);
      clearTimeout(s.wheelTimer);
      s.wheelTimer = setTimeout(settle, 150);
    };
    root.addEventListener("wheel", onWheel, { passive: false });

    const onPointerDown = (e) => {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest?.("[data-nodrag]")) return;
      if (s.flying || s.arrived) return;
      s.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, u0: s.sel, moved: false, type: e.pointerType };
    };
    const onPointerMove = (e) => {
      const rect = root.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      s.ptrT.x = clamp((mx / rect.width - 0.5) * 2, -1, 1);
      s.ptrT.y = clamp((my / rect.height - 0.5) * 2, -1, 1);
      s.mouse.x = mx;
      s.mouse.y = my;
      const d = s.drag;
      if (d && e.pointerId === d.id) {
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) > 7) {
          d.moved = true;
          root.classList.add("is-dragging");
          setTouched(true);
          setMenuOpen(false);
        }
        if (d.moved) {
          const v = s.vec;
          const prog = -(dx * v.x + dy * v.y) / (v.x * v.x + v.y * v.y);
          s.target = clamp(d.u0 + prog, -0.3, N - 1 + 0.3);
          s.anchor = d.u0;
          s.wheelActive = true;
        }
      } else if (e.pointerType === "mouse" && !s.flying && !s.arrived) {
        const l = s.mouse.lastSpark;
        if (Math.hypot(mx - l.x, my - l.y) > 22 && s.settings.motion !== "reduced") {
          l.x = mx;
          l.y = my;
          hero.spark(mx, my, 1, 12);
        }
      }
    };
    const endDrag = (e) => {
      const d = s.drag;
      if (!d || (e && e.pointerId !== d.id)) return;
      s.drag = null;
      root.classList.remove("is-dragging");
      if (d.moved) {
        s.suppressClick = true;
        setTimeout(() => (s.suppressClick = false), 0);
        settle();
      }
    };
    const onPointerLeave = () => {
      s.ptrT.x = 0;
      s.ptrT.y = 0;
    };
    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    root.addEventListener("pointerleave", onPointerLeave);

    const onClick = (e) => {
      if (s.suppressClick) return;
      if (e.target.closest?.("button, a, [data-nodrag]")) return;
      const rect = root.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      s.ripples.push({ x, y, t0: t });
      hero.spark(x, y, 12, 90);
      sfx.tick();
      setMenuOpen(false);
    };
    root.addEventListener("click", onClick);

    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (s.flying || s.arrived) return;
      const next = ["ArrowDown", "ArrowRight", "PageDown"];
      const prev = ["ArrowUp", "ArrowLeft", "PageUp"];
      if (next.includes(e.key)) {
        e.preventDefault();
        setTouched(true);
        select(s.sel + 1);
      } else if (prev.includes(e.key)) {
        e.preventDefault();
        setTouched(true);
        select(s.sel - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        select(0);
      } else if (e.key === "End") {
        e.preventDefault();
        select(N - 1);
      } else if ((e.key === "Enter" || e.key === " ") && (document.activeElement === document.body || document.activeElement === root)) {
        e.preventDefault();
        startFly(s.sel);
      }
    };
    window.addEventListener("keydown", onKey);

    const onDocDown = (e) => {
      if (!e.target.closest?.(".gx-menu, .gx-settings-btn")) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDocDown);

    /* ----- the frame ----- */
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      t += dt;
      const f = s.frame;
      if (!f) return;
      const { w, h, dpr } = s;
      const cfg = s.settings;
      const reduced = cfg.motion === "reduced";

      // pointer smoothing
      const pk = 1 - Math.exp(-dt * 4);
      s.ptr.x += (s.ptrT.x - s.ptr.x) * pk;
      s.ptr.y += (s.ptrT.y - s.ptr.y) * pk;
      const ptr = reduced ? { x: 0, y: 0 } : s.ptr;

      // camera: critically damped spring toward the target planet
      const smoothTime = reduced ? 0.12 : 0.34;
      const om = 2 / smoothTime;
      const x = om * dt;
      const ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
      const change = s.u - s.target;
      const temp = (s.uVel + om * change) * dt;
      s.uVel = (s.uVel - om * temp) * ex;
      s.u = s.target + (change + temp) * ex;
      if (Math.abs(s.u - s.target) < 0.0004 && Math.abs(s.uVel) < 0.001) {
        s.u = s.target;
        s.uVel = 0;
      }
      const u = s.u;
      if (s.pendingFly !== null && Math.abs(u - s.pendingFly) < 0.03 && s.target === s.pendingFly) startFly(s.pendingFly);

      // zoom the chosen planet while the ship closes in
      let zoomT = 1;
      if (s.flying) {
        const zmax = f.portrait ? 0.14 : 0.3;
        zoomT = s.arrived ? 1 + zmax : 1 + zmax * smooth(0.2, 1, hero.flight?.t || 0);
      }
      s.zoom += (zoomT - s.zoom) * Math.min(1, dt * (s.arrived ? 3 : 6));

      const intro = reduced ? 1 : smooth(0, 1.5, t);
      const cam = { x: u * s.vec.x, y: u * s.vec.y };

      /* sky */
      ships.update(cfg.ships ? dt : 0, w, h, reduced);
      if (!cfg.ships) ships.ships.length = 0;
      sky.draw(t, dt, cam, ptr, { drift: !reduced, calm: reduced, ships, route: s.route });

      /* planets */
      let selVis = 0;
      for (let k = 0; k < N; k += 1) {
        const d = k - u;
        sampleRoute(f.table, d, tmp);
        const isSel = k === s.sel;
        const depthK = 0.35 + Math.min(1.4, tmp.r / 75) * 0.65;
        const bob = reduced ? 0 : Math.sin(t * 0.55 + k * 1.7) * 3.2 * f.s;
        const sway = reduced ? 0 : Math.cos(t * 0.4 + k) * 2 * f.s;
        let px = f.fx + tmp.x * f.s - ptr.x * 14 * depthK + sway;
        let py = f.fy + tmp.y * f.s - ptr.y * 9 * depthK + bob;
        let r = tmp.r * f.s;
        if (isSel) r *= s.zoom;
        s.px[k] = px;
        s.py[k] = py;
        s.pr[k] = r;
        const alpha = smooth(-3.4, -2.5, d) * (1 - smooth(8.3, 9.2, d)) * intro * (s.arrived && !isSel ? 0.25 : 1);
        const box = boxRefs.current[k];
        const label = labelRefs.current[k];
        if (!box) continue;
        const scale = r / 100;
        box.style.transform = `translate3d(${(px - BOX / 2).toFixed(1)}px, ${(py - BOX / 2).toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
        box.style.opacity = alpha.toFixed(3);
        box.style.zIndex = String(Math.round(r) + (isSel ? 5 : 0));
        box.style.visibility = alpha < 0.01 ? "hidden" : "visible";
        box.style.pointerEvents = alpha > 0.4 && r > 7 && !s.flying && !s.arrived ? "auto" : "none";
        if (isSel) selVis = alpha;

        if (label) {
          const ls = clamp(r / 55, 0.72, 1.08);
          const show = !isSel && d > -0.45 && alpha > 0.15 && r > 13 && !s.arrived;
          label.style.transform = `translate3d(${px.toFixed(1)}px, ${(py + r + 12 * ls).toFixed(1)}px, 0) translateX(-50%) scale(${ls.toFixed(3)})`;
          label.style.opacity = show ? Math.min(1, alpha * clamp((r - 13) / 12, 0, 1)).toFixed(3) : "0";
          label.style.zIndex = String(Math.round(r) + 2);
        }

        // repaint the planet canvas now and then (it spins)
        const info = pinfo[k];
        if (alpha > 0.01) {
          const p = PLANETS[k];
          const colored = p.charted || isSel || s.hover === k;
          const want = clamp(Math.round((2.5 * r * dpr) / 64) * 64, 96, 640);
          const interval = r > 40 * f.s ? 0.05 : 0.14;
          const key = `${colored ? 1 : 0}`;
          const resized = want > info.B || want < info.B * 0.62;
          if (resized || key !== info.key || (!reduced && t - info.last > interval) || info.last < 0) {
            const cv = canvasRefs.current[k];
            if (resized) {
              cv.width = want;
              cv.height = want;
              info.B = want;
            }
            const pal = colored ? p.palette || UNCHARTED : UNCHARTED;
            const rot = reduced ? k * 0.37 : (t * p.spin + k * 0.37) % 1;
            drawPlanet(pctx[k], info.B, pal, p.charted || (colored && isSel), skins[p.skin], rot);
            info.last = t;
            info.key = key;
          }
        }
      }

      // card visibility follows the settled state
      const card = cardRef.current;
      if (card) {
        const away = Math.abs(u - s.sel) > 0.06 || s.flying || intro < 0.95;
        card.classList.toggle("is-away", away);
      }

      // hover tip position
      const tip = tipRef.current;
      if (tip) {
        const hv = s.hover;
        if (hv >= 0 && !s.flying && !s.arrived) {
          tip.style.opacity = "1";
          tip.style.transform = `translate3d(${s.px[hv].toFixed(1)}px, ${(s.py[hv] - s.pr[hv] - 14).toFixed(1)}px, 0) translate(-50%, -100%)`;
        } else tip.style.opacity = "0";
      }

      /* hero + front layer */
      hero.update(dt, t, ptr, reduced);
      if (reduced) hero.warp = 0;
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.clearRect(0, 0, w, h);
      ships.draw(fctx, "front", (depth) => ({ ox: -cam.x * 0.45 - ptr.x * 26, oy: -cam.y * 0.45 - ptr.y * 16 }), t);
      sparkle(fctx, w * 0.93, h * (f.portrait ? 0.3 : 0.87), 15 * Math.max(0.8, f.s), t);
      hero.draw(fctx, t, w, h, { x: s.px[s.sel], y: s.py[s.sel] });

      for (let i = s.ripples.length - 1; i >= 0; i -= 1) {
        const rp = s.ripples[i];
        const a = (t - rp.t0) / 0.9;
        if (a >= 1) {
          s.ripples.splice(i, 1);
          continue;
        }
        fctx.strokeStyle = `rgba(120,230,214,${(1 - a) * 0.55})`;
        fctx.lineWidth = 1.5;
        fctx.beginPath();
        fctx.arc(rp.x, rp.y, 6 + a * 64, 0, Math.PI * 2);
        fctx.stroke();
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("click", onClick);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDocDown);
      clearTimeout(s.wheelTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setHoverBoth = (i) => {
    S.current.hover = i;
    setHover(i);
  };

  const p = PLANETS[sel];
  const pct = p.charted ? p.mastery : 0;
  const cardTitle = p.name ? p.name.toUpperCase() : "UNKNOWN";
  const cardSub = p.name
    ? `Planet ${sel + 1} · ${p.lessons} modules · ${p.charted ? `${p.mastery}% charted` : "Uncharted"}`
    : `Planet ${sel + 1} · Not yet mapped`;

  return (
    <main ref={rootRef} className={`gx ${portrait ? "is-portrait" : ""} ${flying ? "is-flying" : ""}`} aria-label="edoc galaxy map">
      <canvas ref={skyRef} className="gx-sky" aria-hidden="true" />

      <div className="gx-planets">
        {PLANETS.map((pl, i) => (
          <div key={pl.id} ref={(el) => (boxRefs.current[i] = el)} className={`gx-planet ${i === sel ? "is-sel" : ""} ${hover === i ? "is-hover" : ""}`} style={{ width: BOX, height: BOX }}>
            <canvas ref={(el) => (canvasRefs.current[i] = el)} width={96} height={96} aria-hidden="true" />
            <svg className="gx-ring" viewBox="0 0 250 250" aria-hidden="true">
              <circle className="gx-ring-hover" cx="125" cy="125" r="112" />
              <circle className="gx-ring-sel" cx="125" cy="125" r="112" />
              <circle className="gx-ring-orbit" cx="125" cy="125" r="121" />
            </svg>
            <button
              type="button"
              className="gx-hit"
              aria-label={`${pl.name || "Unknown world"}, planet ${i + 1}${pl.charted ? `, ${pl.mastery}% charted` : ", uncharted"}`}
              aria-pressed={i === sel}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") {
                  setHoverBoth(i);
                  if (i !== S.current.sel) sfx.hover();
                }
              }}
              onPointerLeave={() => setHoverBoth(-1)}
              onFocus={() => i !== S.current.sel && select(i)}
              onClick={() => i !== S.current.sel && select(i)}
            />
          </div>
        ))}
      </div>

      <div className="gx-labels" aria-hidden="true">
        {PLANETS.map((pl, i) => (
          <div key={pl.id} ref={(el) => (labelRefs.current[i] = el)} className={`gx-label ${pl.charted ? "is-charted" : ""} ${hover === i ? "is-hover" : ""}`}>
            <span className="gx-badge">
              <RingedBadge />
            </span>
            <span className="gx-label-text">{pl.charted ? `${pl.mastery}% charted` : "Uncharted"}</span>
          </div>
        ))}
      </div>

      <div ref={tipRef} className="gx-tip" aria-hidden="true">
        {hover >= 0 ? PLANETS[hover].name || "Unknown world" : ""}
      </div>

      <canvas ref={fxRef} className="gx-fx" aria-hidden="true" />

      {/* top bar */}
      <header className="gx-top" data-nodrag>
        <div className="gx-brand">
          <span className="gx-wordmark">edoc</span>
          <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" className="gx-crumb" />
          <h1 className="gx-title">GALAXY</h1>
        </div>
        <div className="gx-tools">
          <button type="button" className="gx-icon" aria-label="Pilot profile" onClick={() => showToast("Pilot profile is not part of this build yet.")}>
            <User size={18} />
          </button>
          <button type="button" className="gx-icon" aria-label={`Fly to ${p.name || "selected world"}`} onClick={() => startFly(sel)}>
            <Rocket size={18} />
          </button>
          <button type="button" className={`gx-icon gx-settings-btn ${menuOpen ? "is-on" : ""}`} aria-label="Settings" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            <Settings size={18} />
          </button>
          <button type="button" className="gx-icon" aria-label={settings.sound ? "Mute sound" : "Turn sound on"} aria-pressed={settings.sound} onClick={() => update({ sound: !settings.sound })}>
            {settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="gx-menu" role="group" aria-label="Galaxy settings" data-nowheel>
            <div className="gx-menu-row">
              <span>Motion</span>
              <div className="gx-seg">
                {["full", "reduced"].map((m) => (
                  <button key={m} type="button" aria-pressed={settings.motion === m} onClick={() => update({ motion: m })}>
                    {m === "full" ? "Full" : "Reduced"}
                  </button>
                ))}
              </div>
            </div>
            <div className="gx-menu-row">
              <span>Stars</span>
              <div className="gx-seg">
                {["low", "normal", "high"].map((m) => (
                  <button key={m} type="button" aria-pressed={settings.stars === m} onClick={() => update({ stars: m })}>
                    {m[0].toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="gx-menu-row">
              <span>Passing ships</span>
              <div className="gx-seg">
                {[true, false].map((m) => (
                  <button key={String(m)} type="button" aria-pressed={settings.ships === m} onClick={() => update({ ships: m })}>
                    {m ? "On" : "Off"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* chosen planet's card */}
      <section ref={cardRef} className="gx-card" aria-label="Selected planet" data-nodrag data-nowheel>
        <div className="gx-card-body" key={sel}>
          <h2 className="gx-card-title">{cardTitle}</h2>
          <p className="gx-card-sub">{cardSub}</p>
          {p.charted && (
            <div className="gx-meter" role="img" aria-label={`${pct}% charted`}>
              <span style={{ width: `${Math.max(pct, 3)}%` }} />
            </div>
          )}
          <button type="button" className="gx-fly" disabled={!p.name || flying} onClick={() => startFly(sel)}>
            <Rocket size={16} aria-hidden="true" />
            <span>{p.name ? `Fly to ${p.name}` : "Out of range"}</span>
          </button>
        </div>
      </section>

      {/* continue pill */}
      <button type="button" className="gx-continue" data-nodrag onClick={() => startFly(0)}>
        <span className="gx-continue-k">Continue</span>
        <span className="gx-continue-v">Loops</span>
        <span className="gx-continue-m">Encounter 3 of 7</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      {/* progress dots */}
      <nav className="gx-dots" aria-label="Planets" data-nodrag>
        {PLANETS.map((pl, i) => (
          <button key={pl.id} type="button" className={i === sel ? "is-on" : ""} aria-label={`Go to ${pl.name || `planet ${i + 1}`}`} aria-current={i === sel} onClick={() => !flying && select(i)} />
        ))}
      </nav>

      <p className={`gx-hint ${touched ? "is-gone" : ""}`} aria-hidden="true">
        Scroll, drag or use the arrow keys to travel
      </p>

      <p className="gx-sr" aria-live="polite">
        {p.name || "Unknown world"}, planet {sel + 1} of {N}
      </p>

      <div className={`gx-toast ${toast ? "is-on" : ""}`} role="status" data-nodrag>
        {toast}
      </div>

      {arrived && (
        <div className="gx-arrive" role="dialog" aria-modal="true" aria-label={`Arrived at ${p.name}`} data-nodrag data-nowheel>
          <div className="gx-arrive-card">
            <p className="gx-arrive-k">Arrived</p>
            <h2>{p.name?.toUpperCase()}</h2>
            <p className="gx-arrive-sub">Landing sequence locked in. The surface map opens here.</p>
            <button type="button" className="gx-fly" onClick={landBack} autoFocus>
              <X size={16} aria-hidden="true" />
              <span>Back to the galaxy</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
