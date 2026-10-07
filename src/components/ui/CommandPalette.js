"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePilot } from "../../context/PilotContext";
import { PLANETARY_SYSTEM, isSectorUnlocked } from "../../lib/planetarySystem";
import {
  Radar,
  Terminal,
  Shield,
  Users,
  Zap,
  Rocket,
  HelpCircle,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Search,
  CornerDownLeft,
  Lock
} from "lucide-react";

/**
 * ⌘K TACTICAL COMMAND PALETTE
 * -------------------------------------------------------------
 * Also serves as the keyboard-accessible navigation path the
 * cursor-none design otherwise lacks: every module and every planet
 * lock is reachable without a pointer.
 */

const GROUP_ORDER = ["NAVIGATION", "AVIONICS", "PLANET LOCK", "SYSTEM"];

export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    paletteOpen,
    setPaletteOpen,
    togglePalette,
    routeToScreen,
    handleNavChange,
    pilotProgress,
    soundEnabled,
    toggleSound,
    nightVision,
    toggleNightVision,
    playSystemSound,
    pushToast
  } = usePilot();

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const close = useCallback(() => {
    setPaletteOpen(false);
    setQuery("");
    setCursor(0);
  }, [setPaletteOpen]);

  /** Open an avionics screen, routing to the bridge deck first if needed. */
  const openScreen = useCallback(
    (screenId, planetId = null) => {
      if (pathname !== "/cockpit") {
        router.push("/cockpit");
        // Let the bridge mount before slaving the viewport to a screen.
        window.setTimeout(() => routeToScreen(screenId, planetId), 90);
      } else {
        routeToScreen(screenId, planetId);
      }
    },
    [pathname, router, routeToScreen]
  );

  const commands = useMemo(() => {
    const list = [
      {
        id: "nav-launchpad",
        group: "NAVIGATION",
        label: "Launchpad",
        hint: "Cinematic galaxy dive",
        keywords: "home landing galaxy dive scroll",
        icon: Rocket,
        run: () => router.push("/")
      },
      {
        id: "nav-bridge",
        group: "NAVIGATION",
        label: "Bridge Deck",
        hint: "Cockpit dashboard",
        keywords: "cockpit dashboard bridge hud",
        icon: Terminal,
        run: () => router.push("/cockpit")
      },
      {
        id: "nav-about",
        group: "NAVIGATION",
        label: "Diagnostics Archive",
        hint: "Architecture spec",
        keywords: "about spec archive diagnostics info",
        icon: HelpCircle,
        run: () => router.push("/about")
      },
      {
        id: "av-radar",
        group: "AVIONICS",
        label: "Star Chart Radar",
        hint: "Orbital contact plot",
        keywords: "radar starchart map orbit plot contacts",
        icon: Radar,
        run: () => openScreen("RADAR")
      },
      {
        id: "av-academy",
        group: "AVIONICS",
        label: "Flight Academy",
        hint: "Planetary syllabus grid",
        keywords: "academy syllabus lessons planets courses",
        icon: Terminal,
        run: () => openScreen("ACADEMY")
      },
      {
        id: "av-missions",
        group: "AVIONICS",
        label: "Space Missions",
        hint: "Bounties & simulator",
        keywords: "missions bounties simulator anomalies",
        icon: Shield,
        run: () => openScreen("MISSIONS")
      },
      {
        id: "av-comm",
        group: "AVIONICS",
        label: "The Comm-Link",
        hint: "Pilot logs & roster",
        keywords: "comm link profile leaderboard badges blog",
        icon: Users,
        run: () => openScreen("COMM")
      },
      {
        id: "av-upgrades",
        group: "AVIONICS",
        label: "Fuel Upgrades",
        hint: "License tiers",
        keywords: "upgrades fuel license pricing tiers",
        icon: Zap,
        run: () => openScreen("UPGRADES")
      },
      {
        id: "av-standby",
        group: "AVIONICS",
        label: "Clear Viewport",
        hint: "Return to raw windshield",
        keywords: "close clear standby none windshield",
        icon: Rocket,
        run: () => handleNavChange("NONE")
      }
    ];

    PLANETARY_SYSTEM.forEach((sector) => {
      const unlocked = isSectorUnlocked(sector.id, pilotProgress);
      list.push({
        id: `planet-${sector.id}`,
        group: "PLANET LOCK",
        label: sector.name,
        hint: `${sector.designation} // ${sector.classification}`,
        keywords: `${sector.id} ${sector.short} ${sector.classification} ${sector.tier} planet lock`,
        accent: sector.hex,
        locked: !unlocked,
        run: () => {
          if (!unlocked) {
            playSystemSound("ERROR");
            pushToast({
              title: "Clearance denied",
              body: `${sector.designation} requires level ${sector.requires.level} on ${sector.requires.id}.`,
              tone: "danger",
              voice: null
            });
            return;
          }
          openScreen("ACADEMY", sector.id);
        }
      });
    });

    list.push(
      {
        id: "sys-sound",
        group: "SYSTEM",
        label: soundEnabled ? "Mute avionics audio" : "Unmute avionics audio",
        hint: "Polyphonic sound bus",
        keywords: "sound audio mute volume sfx",
        icon: soundEnabled ? VolumeX : Volume2,
        keepOpen: true,
        run: () => toggleSound()
      },
      {
        id: "sys-night",
        group: "SYSTEM",
        label: nightVision ? "Disable night vision" : "Enable night vision",
        hint: "Canopy tint profile",
        keywords: "night vision theme dark tint",
        icon: nightVision ? Sun : Moon,
        keepOpen: true,
        run: () => toggleNightVision()
      }
    );

    return list;
  }, [
    router,
    openScreen,
    handleNavChange,
    pilotProgress,
    soundEnabled,
    toggleSound,
    nightVision,
    toggleNightVision,
    playSystemSound,
    pushToast
  ]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => {
      const haystack = `${cmd.label} ${cmd.hint} ${cmd.keywords}`.toLowerCase();
      return q.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [commands, query]);

  const grouped = useMemo(() => {
    const buckets = new Map();
    results.forEach((cmd) => {
      if (!buckets.has(cmd.group)) buckets.set(cmd.group, []);
      buckets.get(cmd.group).push(cmd);
    });
    return GROUP_ORDER.filter((g) => buckets.has(g)).map((g) => ({ group: g, items: buckets.get(g) }));
  }, [results]);

  // Flat ordering must match the rendered order for arrow navigation.
  const flat = useMemo(() => grouped.flatMap((section) => section.items), [grouped]);

  const execute = useCallback(
    (cmd) => {
      if (!cmd) return;
      playSystemSound("CLICK");
      cmd.run();
      if (!cmd.keepOpen) close();
    },
    [close, playSystemSound]
  );

  /* Global ⌘K / Ctrl+K hotkey. */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette]);

  /* Palette-scoped keyboard handling. */
  useEffect(() => {
    if (!paletteOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        playSystemSound("CLOSE");
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => (flat.length ? (c + 1) % flat.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => (flat.length ? (c - 1 + flat.length) % flat.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        execute(flat[cursor]);
      } else if (e.key === "Tab") {
        // Non-Negotiables Pass: the palette drives selection entirely off
        // the `cursor` index (arrow keys), not real DOM focus — so a bare
        // Tab used to walk keyboard focus straight out to the page behind
        // it. Keep it on the search input, the palette's one true focus
        // target, instead.
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, flat, cursor, execute, close, playSystemSound]);

  useEffect(() => {
    if (paletteOpen) {
      setCursor(0);
      // Focus after paint so the transform-in animation is not interrupted.
      const t = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [paletteOpen]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  // Keep the highlighted row in view during keyboard traversal.
  useEffect(() => {
    if (!paletteOpen || !listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [cursor, paletteOpen]);

  if (!paletteOpen) return null;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[130] font-mono" role="dialog" aria-modal="true" aria-label="Command palette">
      <button
        aria-label="Close command palette"
        onClick={() => {
          playSystemSound("CLOSE");
          close();
        }}
        className="absolute inset-0 w-full h-full bg-black/70 backdrop-blur-sm cursor-none"
      />

      <div className="absolute inset-x-0 top-[12vh] mx-auto w-[min(92vw,620px)] animate-palette-in">
        <div className="scope-frame scope-glow-lg border border-cyan-500/30 bg-slate-950/95 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-scanlines opacity-[0.02] pointer-events-none" />

          {/* Query line — extra left padding clears the corner accent tick */}
          <div className="flex items-center gap-2.5 pl-7 pr-4 py-3.5 border-b border-slate-900">
            <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules, planets and system toggles..."
              className="flex-1 bg-transparent outline-hidden focus-visible:outline-none text-xs text-slate-100 placeholder-slate-600 font-mono cursor-none"
              aria-label="Command search"
            />
            <kbd className="text-[8px] font-black uppercase tracking-widest text-slate-600 border border-slate-800 rounded px-1.5 py-0.5 shrink-0">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[46vh] overflow-y-auto py-1.5">
            {grouped.length === 0 && (
              <div className="px-4 py-8 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest">
                No matching commands in the avionics registry
              </div>
            )}

            {grouped.map((section) => (
              <div key={section.group} className="pb-1">
                <div className="px-4 pt-2 pb-1 font-scope text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                  {section.group}
                </div>
                {section.items.map((cmd) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const isActive = index === cursor;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      data-active={isActive}
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => execute(cmd)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-150 cursor-none ${
                        isActive ? "bg-cyan-950/40" : "hover:bg-slate-900/40"
                      }`}
                    >
                      <span className="w-4 shrink-0 flex items-center justify-center">
                        {Icon ? (
                          <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: cmd.locked ? "#334155" : cmd.accent,
                              boxShadow: cmd.locked ? "none" : `0 0 6px ${cmd.accent}`
                            }}
                          />
                        )}
                      </span>

                      <span
                        className={`font-scope text-[13px] font-semibold uppercase tracking-wide truncate ${
                          cmd.locked ? "text-slate-600" : isActive ? "text-cyan-400" : "text-slate-200"
                        }`}
                      >
                        {cmd.label}
                      </span>

                      <span className="text-[9px] text-slate-600 font-sans truncate hidden sm:block flex-1">
                        {cmd.hint}
                      </span>

                      {cmd.locked && <Lock className="w-2.5 h-2.5 text-slate-600 shrink-0 ml-auto" />}

                      {isActive && !cmd.locked && (
                        <CornerDownLeft className="w-3 h-3 text-cyan-500/70 shrink-0 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer legend */}
          <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/70 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-600">
            <span className="flex items-center gap-2.5">
              <span>↑↓ Traverse</span>
              <span>⏎ Engage</span>
            </span>
            <span className="tabular-nums">{flat.length} commands</span>
          </div>
        </div>
      </div>
    </div>
  );
}
