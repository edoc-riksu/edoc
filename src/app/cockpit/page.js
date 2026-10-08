"use client";
import React, { useEffect, useRef, useState } from "react";
import SpaceWindshield from "../../components/SpaceWindshield";
import HudScreens from "../../components/HudScreens";
import BiometricLinkModal from "../../components/ui/BiometricLinkModal";
import TravelSequence from "../../components/ui/TravelSequence";
import CockpitDial from "../../components/ui/CockpitDial";
import Button from "../../components/ui/Button";
import { usePilot } from "../../context/PilotContext";
import { findSector } from "../../lib/planetarySystem";
import { Terminal, Shield, Users, Radio, Zap, ShieldAlert, LogIn, Sun, Moon, Eye, EyeOff, Gauge, UserRound } from "lucide-react";

export default function HyperGamingCockpitBridge() {
  // The whole canopy reacts to the pointer — a soft instrument-panel
  // glow tracks the cursor so the flat chrome reads as a live, touch-
  // responsive surface rather than a static screenshot of one. The
  // pointer fires far more often than the screen repaints (a high-poll
  // mouse can send hundreds of events/sec), so raw events are only ever
  // recorded into a ref here — a single rAF loop coalesces them into at
  // most one style write per frame, and the bounding rect is cached
  // instead of re-read on every event (a forced-layout call stacked on
  // top of the already-busy WebGL frame was real, avoidable jank).
  const canopyRef = useRef(null);
  const [glowLive, setGlowLive] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const rectRef = useRef(null);
  useEffect(() => {
    const node = canopyRef.current;
    if (!node) return undefined;
    let rafId = null;
    const applyGlow = () => {
      rafId = null;
      const rect = rectRef.current;
      if (!rect) return;
      node.style.setProperty("--cx", `${((pointerRef.current.x - rect.left) / rect.width) * 100}%`);
      node.style.setProperty("--cy", `${((pointerRef.current.y - rect.top) / rect.height) * 100}%`);
    };
    const handleMove = (e) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
      if (rafId === null) rafId = requestAnimationFrame(applyGlow);
    };
    const handleEnter = () => {
      rectRef.current = node.getBoundingClientRect();
      setGlowLive(true);
    };
    const handleLeave = () => setGlowLive(false);
    const handleResize = () => { rectRef.current = node.getBoundingClientRect(); };
    node.addEventListener("pointermove", handleMove, { passive: true });
    node.addEventListener("pointerenter", handleEnter);
    node.addEventListener("pointerleave", handleLeave);
    window.addEventListener("resize", handleResize);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      node.removeEventListener("pointermove", handleMove);
      node.removeEventListener("pointerenter", handleEnter);
      node.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const {
    activeScreen,
    warpSpeed,
    nightVision,
    isPilotLoggedIn,
    pilotCallsign,
    selectedLanguage,
    fuelCells,
    travelSequence,
    setSelectedLanguage,
    handleNavChange,
    toggleNightVision,
    beginBiometricLink,
    disconnectPilot,
    playSystemSound,
    pushToast,
  } = usePilot();

  // Clicking a body directly in the 3D viewport locks the camera gimbal
  // onto it, mirroring the radar's own select/deselect flow one-for-one.
  const handleSelectPlanet = (planetId) => {
    if (planetId === selectedLanguage) {
      setSelectedLanguage(null);
      playSystemSound("CLOSE");
      return;
    }
    setSelectedLanguage(planetId);
    if (planetId) {
      playSystemSound("LOCK");
      const sector = findSector(planetId);
      if (sector) {
        pushToast({
          title: `Gimbal locked // ${sector.designation}`,
          body: `${sector.name} — ${sector.classification}. Camera vector slaved to target.`,
          tone: "info",
          voice: null
        });
      }
    } else {
      playSystemSound("CLOSE");
    }
  };

  return (
    <div
      ref={canopyRef}
      data-hud-vision={nightVision ? "night" : "day"}
      className="relative w-screen h-screen overflow-hidden font-mono select-none text-cyan-400"
    >
      {/* Pointer-reactive instrument glow — purely decorative, never blocks a click */}
      <div className="cockpit-cursor-glow" data-live={glowLive ? "true" : "false"} />

      {/* WEBGL 3D ENVIRONMENT LAYER */}
      <SpaceWindshield
        speed={warpSpeed}
        currentTarget={selectedLanguage}
        onSelectPlanet={handleSelectPlanet}
        interactive={!travelSequence.active}
        landingSequence={travelSequence.active}
      />

      {/* TACTICAL GLASS INTERFACE MATRIX — fully steps aside during a travel
          sequence so the pilot sees nothing but space and the sequence's own
          minimal controls, the way Solar System Scope keeps its chrome to a
          handful of small icon buttons and never a wall of panels. */}
      <div
        inert={travelSequence.active}
        className={`absolute inset-0 z-10 flex flex-col p-4 justify-between border-[16px] border-slate-950 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none transition-opacity duration-300 ${
          travelSequence.active ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* CANOPY EDGE TELEMETRY — micro-vector aiming ticks + a fake nav-grid
            coordinate readout, purely decorative, pinned to the outer frame. */}
        <div className="pointer-events-none absolute top-1 left-1 w-4 h-4 hidden sm:block">
          <span className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-cyan-500/40" />
          <span className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-cyan-500/40" />
        </div>
        <div className="pointer-events-none absolute top-1 right-1 w-4 h-4 hidden sm:block">
          <span className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-cyan-500/40" />
          <span className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-cyan-500/40" />
        </div>
        <div className="pointer-events-none absolute bottom-1 left-1 font-scope text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-700 hidden lg:block tabular-nums">
          GRID // X{selectedLanguage ? "512.44" : "128.06"} Y340.19
        </div>

        {/* TACTICAL HEADER SCREEN */}
        <header className="scope-frame scope-glow w-full flex items-center justify-between bg-slate-950/70 backdrop-blur-md px-5 py-3 border border-cyan-500/30 pointer-events-auto">
          <div className="flex items-center gap-3">
            <Radio className={`w-3.5 h-3.5 ${isPilotLoggedIn ? "text-emerald-400 animate-pulse" : "text-amber-500 animate-pulse"}`} />
            <div className="flex flex-col">
              <span className="font-scope text-sm font-semibold text-slate-100 tracking-[0.2em] uppercase leading-none">Bridge Radar Display</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">SEC_LOC // ORION_ARM_NODE4</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2.5">
            {isPilotLoggedIn && pilotCallsign && (
              <div className="cockpit-pill hidden lg:inline-flex" title="Pilot callsign">
                <UserRound className="w-3 h-3 text-cyan-400" />
                <span className="font-scope text-[10px] font-bold tracking-wide text-cyan-300">{pilotCallsign}</span>
              </div>
            )}
            <div className="cockpit-pill" title="Reaction Cells — spend these on academy upgrades">
              <Gauge className="w-3 h-3 text-amber-400" />
              <span className="font-scope text-[10px] font-bold tracking-wide text-slate-300">{fuelCells} <span className="text-amber-400">CLS</span></span>
            </div>
            <div className="cockpit-pill" title="Core Compiler status">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="font-scope text-[10px] font-bold tracking-wide text-emerald-400">READY</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <CockpitDial
              icon={nightVision ? Moon : Sun}
              label={nightVision ? "Switch to daylight filter" : "Switch to night vision"}
              size="sm"
              tipSide="bottom"
              onClick={toggleNightVision}
            />
            <Button size="sm" icon={LogIn} tone={isPilotLoggedIn ? "success" : "default"} onClick={() => (isPilotLoggedIn ? disconnectPilot() : beginBiometricLink())}>
              {isPilotLoggedIn ? "Disconnect" : "Biometric Link"}
            </Button>
          </div>
        </header>

        {/* WORKSPACE COLUMN — top-level avionics nav bar over the viewport,
            replacing the old icon-only vertical rail. Every control keeps
            its full, exact name, spelled out on the switch itself now
            instead of tucked behind a hover flyout. */}
        <div className="flex-1 my-3 flex flex-col gap-3 overflow-hidden">
          <nav
            aria-label="Primary Avionics Navigation"
            className="relative scope-frame backdrop-blur-md bg-slate-950/40 border border-cyan-500/20 px-3 sm:px-4 py-2 pointer-events-auto shadow-2xl shrink-0 overflow-x-auto"
          >
            {/* Micro-vector aiming targets — corner crosshair ticks on the panel itself */}
            <span className="pointer-events-none absolute top-0 left-2 w-2.5 h-2.5 border-t border-l border-cyan-400/50" />
            <span className="pointer-events-none absolute top-0 right-2 w-2.5 h-2.5 border-t border-r border-cyan-400/50" />
            <span className="pointer-events-none absolute bottom-0 left-2 w-2.5 h-2.5 border-b border-l border-cyan-400/50" />
            <span className="pointer-events-none absolute bottom-0 right-2 w-2.5 h-2.5 border-b border-r border-cyan-400/50" />

            <div className="flex items-center gap-1.5 min-w-max">
              <div className="hidden lg:flex flex-col items-start pr-3 mr-1.5 border-r border-slate-800/80 shrink-0">
                <span className="font-scope text-[7px] text-slate-600 font-semibold tracking-[0.15em] uppercase leading-tight">Avionics</span>
                <span className="font-scope text-[7px] text-slate-600 font-semibold tracking-[0.15em] uppercase leading-tight">Array</span>
              </div>

              <NavTab icon={activeScreen === "RADAR" ? EyeOff : Eye} label="Star Chart Radar" active={activeScreen === "RADAR"} onClick={() => handleNavChange("RADAR")} coord="00.14" />
              <NavTab icon={Terminal} label="Flight Academy" active={activeScreen === "ACADEMY"} onClick={() => handleNavChange("ACADEMY")} coord="02.71" />
              <NavTab icon={Shield} label="Space Missions" active={activeScreen === "MISSIONS"} onClick={() => handleNavChange("MISSIONS")} coord="05.38" />
              <NavTab icon={Users} label="The Comm-Link" active={activeScreen === "COMM"} onClick={() => handleNavChange("COMM")} coord="08.02" />
              <NavTab icon={Zap} label="Fuel Upgrades" active={activeScreen === "UPGRADES"} onClick={() => handleNavChange("UPGRADES")} coord="11.55" />

              <div className="w-px self-stretch bg-slate-800/80 mx-1 shrink-0" />
              <CockpitDial icon={ShieldAlert} label="Combat Array" active={activeScreen === "COMBAT"} size="sm" tipSide="bottom" onClick={() => handleNavChange("COMBAT")} />
            </div>
          </nav>

          {/* HOLOGRAPHIC TACTICAL VIEWPORT */}
          <div className="flex-1 flex overflow-hidden items-stretch">
            {activeScreen !== "NONE" && (
              <main className="scope-frame scope-frame-lg flex-1 bg-slate-950/40 backdrop-blur-xs border border-cyan-500/10 pointer-events-auto overflow-y-auto shadow-2xl relative">
                <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.015] z-50"></div>
                <div className={`p-4 h-full`}>
                  <HudScreens
                    activeScreen={activeScreen}
                    selectedLanguage={selectedLanguage}
                    setSelectedLanguage={setSelectedLanguage}
                    isPilotLoggedIn={isPilotLoggedIn}
                  />
                </div>
              </main>
            )}
          </div>
        </div>

        {/* LOWER TELEMETRY HUD BAR */}
        <footer className="scope-frame w-full bg-slate-950/70 backdrop-blur-md px-4 py-2 border border-slate-900 pointer-events-auto flex items-center justify-between shadow-2xl">
          <div className="cockpit-pill" title="Telemetry Rectification">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="font-scope text-[9px] font-bold tracking-wide text-slate-400">TELEMETRY <span className="text-emerald-400">STEADY</span></span>
          </div>
          <div className="cockpit-pill" title="Velocity Drive">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <div className="w-16 bg-slate-900/80 h-1 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: warpSpeed > 1 ? "100%" : "25%" }}></div>
            </div>
          </div>
        </footer>

      </div>

      <BiometricLinkModal />
      <TravelSequence />
    </div>
  );
}

/**
 * Top-level avionics nav tab — presentation only. Every prop it takes
 * (icon, exact label text, active flag, click handler) is passed straight
 * through from the same `activeScreen` / `handleNavChange` wiring the old
 * vertical CockpitDial rail used; this only changes how the switch looks
 * and reads, never what it does. A small crosshair mark ticks on above
 * whichever tab is active, and a faint fake nav-grid coordinate sits under
 * the label on wide viewports — both purely decorative.
 */
function NavTab({ icon: Icon, label, active, onClick, coord }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2 px-3 py-2 shrink-0 font-display text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
        active
          ? "bg-cyan-950/40 border-cyan-500/60 text-cyan-300"
          : "bg-transparent border-transparent text-slate-500 hover:text-cyan-300 hover:border-cyan-500/25 hover:bg-slate-900/40"
      }`}
      style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
    >
      {active && (
        <span className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5">
          <span className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-cyan-400/80" />
          <span className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-cyan-400/80" />
        </span>
      )}
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
      <span className={`hidden xl:inline text-[8px] tracking-normal font-normal tabular-nums ${active ? "text-cyan-500/70" : "text-slate-700"}`}>
        {coord}
      </span>
    </button>
  );
}
