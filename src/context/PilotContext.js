"use client";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { playVoice, primeAudio, setMasterVolume } from "../lib/soundCore";
import { findSector } from "../lib/planetarySystem";

const PilotContext = createContext();

let toastSerial = 0;

export function PilotProvider({ children }) {
  const [activeScreen, setActiveScreen] = useState("NONE");
  const [warpSpeed, setWarpSpeed] = useState(1);
  const [nightVision, setNightVision] = useState(true);
  const [isPilotLoggedIn, setIsPilotLoggedIn] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [fuelCells, setFuelCells] = useState(150);

  // 🔐 BIOMETRIC LINK — the pilot's chosen callsign, bound once the
  // "Biometric Link" scan flow completes. Persisted so a returning pilot
  // stays linked instead of silently resetting to guest on every reload
  // (which is what the old boolean-only toggle did).
  const [pilotCallsign, setPilotCallsign] = useState(null);
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);

  // 🚀 TRAVEL SEQUENCE — boarding → warp flight → landing, played out over
  // the persistent 3D viewport before a chosen sector's terminal opens.
  // Selecting a language used to jump straight to the Code Terminal with
  // no sense that the pilot actually flew anywhere to get there.
  const [travelSequence, setTravelSequence] = useState({ active: false, phase: "IDLE", destination: null });

  // 🎥 2026 VIRTUAL TIMELINE INTERPOLATOR METRICS (Lusion.co Emulation Core)
  const [virtualScroll, setVirtualScroll] = useState(0); // Smooth floating progress float from 0 to 4
  const [targetVirtualScroll, setTargetVirtualScroll] = useState(0);

  // 🔊 AVIONICS AUDIO BUS STATE
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 🛰️ CANOPY OVERLAY LAYER STATE (boot shutters, palette, alert stack)
  const [bootComplete, setBootComplete] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef(Object.create(null));

  // 🔥 RELAY STREAK — a real (if entirely client-side) daily-visit counter,
  // the "#30NitesOfCode"-style recurring challenge for Space Missions.
  const [flightStreak, setFlightStreak] = useState(0);

  const [pilotProgress, setPilotProgress] = useState({
    "Python Engine Core": 0,
    "JavaScript Engine": 0,
    "TypeScript Array": 0,
    "Go Engine Subsystem": 0,
    "Rust Core Defense": 0,
    "SQL Relational Matrix": 0
  });

  // 🎯 FLIGHT MODE — Practice / Ranked / Proctored / Campus. A cross-cutting
  // way of working a sector, not a screen of its own (see FlightAcademy's
  // mode switcher). Practice is the default and the only mode that's fully
  // ungated per the platform's own non-negotiable: a pilot can always
  // attempt any exercise, whether or not they've reached it yet.
  const [pilotMode, setPilotModeRaw] = useState("PRACTICE");
  // Ranked's ladder rating — a local Elo-lite score. Real server authority
  // is a later, backend-dependent upgrade; this is the honest client-only
  // seam for it in the meantime.
  const [rankedRating, setRankedRatingRaw] = useState(1000);
  // Combat Array's own local record — separate from Ranked's rating, since
  // Battles (Solo/Duel) aren't ladder-scored, just win/loss flavor.
  const [battleRecord, setBattleRecordRaw] = useState({ wins: 0, losses: 0, bestWave: 0 });
  // Lessons cleared out-of-order in Practice mode — kept separate from
  // `pilotProgress` (the sequential frontier certificates/badges/mastery
  // all key off) so free-form practice can never silently inflate a
  // certificate's meaning.
  const [practiceCleared, setPracticeCleared] = useState({});
  // Ephemeral — set right before beginPlanetTravel so CodeTerminal knows
  // which out-of-frontier exercise to open in Practice mode. Never
  // persisted; cleared the instant it's consumed.
  const [practiceTargetIndex, setPracticeTargetIndex] = useState(null);

  // 🧩 SALVAGE ARTIFACTS — one auto-generated per real (in-frontier) exercise
  // clear, capturing the pilot's own submitted code. This is what the
  // Shipyard shows instead of flavor-text cards: real proof of real work.
  const [salvageArtifacts, setSalvageArtifacts] = useState([]);
  // 🛠️ WORKSHOP PROJECTS — multi-file builds, either started from a Guided
  // Build catalog entry (projects.js) or from scratch. Draft until the
  // pilot explicitly publishes it to the Shipyard.
  const [workshopProjects, setWorkshopProjects] = useState([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("HUD_NIGHT_VISION");
    const savedCells = localStorage.getItem("HUD_FUEL_CELLS");
    const savedProgress = localStorage.getItem("HUD_PILOT_PROGRESS");
    const savedAudio = localStorage.getItem("HUD_SOUND_ENABLED");
    const savedMode = localStorage.getItem("HUD_PILOT_MODE");
    const savedRating = localStorage.getItem("HUD_RANKED_RATING");
    const savedPractice = localStorage.getItem("HUD_PRACTICE_CLEARED");
    const savedBattleRecord = localStorage.getItem("HUD_BATTLE_RECORD");
    const savedSalvage = localStorage.getItem("HUD_SALVAGE_ARTIFACTS");
    const savedWorkshop = localStorage.getItem("HUD_WORKSHOP_PROJECTS");
    if (savedTheme !== null) setNightVision(savedTheme === "true");
    if (savedCells !== null) setFuelCells(parseInt(savedCells, 10));
    if (savedProgress !== null) {
      try {
        setPilotProgress((prev) => ({ ...prev, ...JSON.parse(savedProgress) }));
      } catch {
        /* A corrupt cache should never blank the cockpit. */
      }
    }
    if (savedAudio !== null) setSoundEnabled(savedAudio === "true");
    if (savedMode === "PRACTICE" || savedMode === "RANKED" || savedMode === "PROCTORED" || savedMode === "CAMPUS") {
      setPilotModeRaw(savedMode);
    }
    if (savedRating !== null) setRankedRatingRaw(parseInt(savedRating, 10) || 1000);
    if (savedPractice !== null) {
      try {
        setPracticeCleared(JSON.parse(savedPractice));
      } catch {
        /* A corrupt cache just means practice history resets, nothing load-bearing. */
      }
    }
    if (savedBattleRecord !== null) {
      try {
        setBattleRecordRaw((prev) => ({ ...prev, ...JSON.parse(savedBattleRecord) }));
      } catch {
        /* A corrupt cache just resets the local combat record. */
      }
    }
    if (savedSalvage !== null) {
      try {
        const parsed = JSON.parse(savedSalvage);
        if (Array.isArray(parsed)) setSalvageArtifacts(parsed);
      } catch {
        /* A corrupt cache just means salvage history resets. */
      }
    }
    if (savedWorkshop !== null) {
      try {
        const parsed = JSON.parse(savedWorkshop);
        if (Array.isArray(parsed)) setWorkshopProjects(parsed);
      } catch {
        /* A corrupt cache just means Workshop projects reset. */
      }
    }

    const savedCallsign = localStorage.getItem("HUD_PILOT_CALLSIGN");
    if (savedCallsign) {
      setPilotCallsign(savedCallsign);
      setIsPilotLoggedIn(true);
    }

    // Relay streak: one tick per calendar day, consecutive days extend it,
    // a gap resets it — the same shape as any daily-challenge counter.
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastDate = localStorage.getItem("HUD_STREAK_LAST_DATE");
      const savedStreak = parseInt(localStorage.getItem("HUD_STREAK_COUNT") || "0", 10);
      let nextStreak = savedStreak;

      if (lastDate === today) {
        nextStreak = savedStreak || 1;
      } else if (lastDate) {
        const dayGapMs = new Date(today).getTime() - new Date(lastDate).getTime();
        const dayGap = Math.round(dayGapMs / 86400000);
        nextStreak = dayGap === 1 ? savedStreak + 1 : 1;
      } else {
        nextStreak = 1;
      }

      setFlightStreak(nextStreak);
      localStorage.setItem("HUD_STREAK_COUNT", String(nextStreak));
      localStorage.setItem("HUD_STREAK_LAST_DATE", today);
    } catch {
      /* A blocked or private-mode store just means no streak this session. */
    }
  }, []);

  // Smoothly damp virtual timeline offsets toward target vectors
  useEffect(() => {
    let animationFrameId;
    const updateInterpolation = () => {
      setVirtualScroll((prev) => {
        const diff = targetVirtualScroll - prev;
        if (Math.abs(diff) < 0.001) return targetVirtualScroll;
        return prev + diff * 0.08; // 8% damping matrix speed per frame trace
      });
      animationFrameId = requestAnimationFrame(updateInterpolation);
    };
    animationFrameId = requestAnimationFrame(updateInterpolation);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetVirtualScroll]);

  /* =========================================================
     🔊 SOUND BUS
     ========================================================= */

  const playSystemSound = useCallback(
    (voiceId) => {
      if (!soundEnabled) return;
      playVoice(voiceId);
    },
    [soundEnabled]
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("HUD_SOUND_ENABLED", String(next));
      if (next) {
        primeAudio();
        playVoice("OPEN");
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setMasterVolume(soundEnabled ? 0.4 : 0);
  }, [soundEnabled]);

  // The very first gesture anywhere unlocks the browser audio context.
  useEffect(() => {
    const unlock = () => primeAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  /* =========================================================
     🛎️ CANOPY ALERT STACK
     ========================================================= */

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  const pushToast = useCallback(
    ({ title, body = "", tone = "info", ttl = 4200, voice = "TOAST" }) => {
      toastSerial += 1;
      const id = `alert_${toastSerial}`;
      const entry = { id, title, body, tone, ttl };

      // Cap the stack so a rapid burst can never bury the canopy.
      setToasts((prev) => [...prev.slice(-3), entry]);
      if (voice) playSystemSound(voice);

      toastTimers.current[id] = setTimeout(() => dismissToast(id), ttl);
      return id;
    },
    [dismissToast, playSystemSound]
  );

  useEffect(
    () => () => {
      Object.values(toastTimers.current).forEach(clearTimeout);
      toastTimers.current = Object.create(null);
    },
    []
  );

  /* =========================================================
     🎛️ NAVIGATION + PROGRESSION
     ========================================================= */

  const handleNavChange = (screenId) => {
    setActiveScreen(activeScreen === screenId ? "NONE" : screenId);
    setSelectedLanguage(null);
    setWarpSpeed(6);
    playSystemSound("CLICK");
    setTimeout(() => setWarpSpeed(1), 500);
  };

  /**
   * Jump straight to a screen while preserving an already-chosen planet.
   * `handleNavChange` intentionally clears the planet lock, which makes it
   * the wrong tool for "open the terminal on THIS planet" flows.
   */
  const routeToScreen = useCallback((screenId, planetId = null) => {
    setActiveScreen(screenId);
    setSelectedLanguage(planetId);
    setWarpSpeed(6);
    setTimeout(() => setWarpSpeed(1), 500);
  }, []);

  const toggleNightVision = useCallback(() => {
    setNightVision((prev) => {
      const next = !prev;
      localStorage.setItem("HUD_NIGHT_VISION", String(next));
      return next;
    });
    playSystemSound("CLICK");
  }, [playSystemSound]);

  const togglePalette = useCallback(() => {
    setPaletteOpen((prev) => {
      playVoice(prev ? "CLOSE" : "OPEN");
      return !prev;
    });
  }, []);

  const completeBoot = useCallback(() => setBootComplete(true), []);

  const advanceLesson = (langId) => {
    const currentLevel = pilotProgress[langId] || 0;
    const sector = findSector(langId);
    // Bug fix (Phase 01 follow-up): this used to hard-code a cap of 3, a
    // leftover from when every sector had exactly 3 lessons. Now that
    // sectors carry 8 (Core + Applied), that hard-coded cap silently
    // capped every pilot's progress at lesson 3 forever. Cap against the
    // sector's real lesson count instead.
    const cap = sector ? sector.totalLessons : currentLevel + 1;
    if (currentLevel < cap) {
      const updatedProgress = { ...pilotProgress, [langId]: currentLevel + 1 };
      setPilotProgress(updatedProgress);
      localStorage.setItem("HUD_PILOT_PROGRESS", JSON.stringify(updatedProgress));
    }
  };

  const creditFuelCells = (amount) => {
    const targetTotal = fuelCells + amount;
    setFuelCells(targetTotal);
    localStorage.setItem("HUD_FUEL_CELLS", String(targetTotal));
  };

  const setPilotMode = useCallback(
    (mode) => {
      setPilotModeRaw(mode);
      localStorage.setItem("HUD_PILOT_MODE", mode);
      playSystemSound("CLICK");
    },
    [playSystemSound]
  );

  const setRankedRating = useCallback((updater) => {
    setRankedRatingRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const clamped = Math.max(0, Math.round(next));
      localStorage.setItem("HUD_RANKED_RATING", String(clamped));
      return clamped;
    });
  }, []);

  /**
   * Practice-mode clear for a lesson beyond the pilot's real frontier.
   * Never touches `pilotProgress` (so certificates/badges/mastery keep
   * meaning "reached in order") but still logs it as practiced and pays
   * out a smaller flat reward than a real, in-order clear.
   */
  const markPracticeCleared = useCallback(
    (sectorId, lessonIdx) => {
      setPracticeCleared((prev) => {
        const existing = prev[sectorId] || [];
        if (existing.includes(lessonIdx)) return prev;
        const next = { ...prev, [sectorId]: [...existing, lessonIdx] };
        localStorage.setItem("HUD_PRACTICE_CLEARED", JSON.stringify(next));
        return next;
      });
    },
    []
  );

  /** Records a Combat Array outcome. `wave` (Solo only) tracks the best wave reached this run. */
  const recordBattleResult = useCallback((won, wave = 0) => {
    setBattleRecordRaw((prev) => {
      const next = {
        wins: prev.wins + (won ? 1 : 0),
        losses: prev.losses + (won ? 0 : 1),
        bestWave: Math.max(prev.bestWave, wave)
      };
      localStorage.setItem("HUD_BATTLE_RECORD", JSON.stringify(next));
      return next;
    });
  }, []);

  /* =========================================================
     🧩 SALVAGE ARTIFACTS + 🛠️ WORKSHOP PROJECTS
     ========================================================= */

  /** Logs a real exercise clear as a keepable salvage artifact. */
  const addSalvageArtifact = useCallback(({ sectorId, sectorName, lessonTitle, concept, code }) => {
    setSalvageArtifacts((prev) => {
      const entry = {
        id: `salvage_${Date.now()}_${prev.length}`,
        sectorId,
        sectorName: sectorName || sectorId,
        lessonTitle,
        concept: concept || "Applied",
        code: code || "",
        // Numeric epoch ms — commsFeed's timeAgo() expects `Date.now() - ts`
        // to be a number, not an ISO string (which coerces to NaN).
        clearedAt: Date.now()
      };
      const next = [entry, ...prev].slice(0, 200);
      localStorage.setItem("HUD_SALVAGE_ARTIFACTS", JSON.stringify(next));
      return next;
    });
  }, []);

  /** Starts a new Workshop project (from a Guided Build seed or a blank one). Returns its id. */
  const createWorkshopProject = useCallback(({ title, files, sourceGuidedBuildId = null }) => {
    const id = `workshop_${Date.now()}`;
    const now = new Date().toISOString();
    setWorkshopProjects((prev) => {
      const entry = {
        id,
        title: title || "Untitled Build",
        files: Array.isArray(files) && files.length ? files : [{ name: "main.txt", content: "" }],
        sourceGuidedBuildId,
        status: "draft",
        createdAt: now,
        updatedAt: now
      };
      const next = [entry, ...prev];
      localStorage.setItem("HUD_WORKSHOP_PROJECTS", JSON.stringify(next));
      return next;
    });
    return id;
  }, []);

  /** Patches an existing Workshop project (title/files/status) and stamps updatedAt. */
  const saveWorkshopProject = useCallback((id, updates) => {
    setWorkshopProjects((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      );
      localStorage.setItem("HUD_WORKSHOP_PROJECTS", JSON.stringify(next));
      return next;
    });
  }, []);

  /** Publishes a draft Workshop project to the Shipyard. */
  const publishWorkshopProject = useCallback(
    (id) => {
      setWorkshopProjects((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, status: "published", publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : p
        );
        localStorage.setItem("HUD_WORKSHOP_PROJECTS", JSON.stringify(next));
        return next;
      });
      pushToast({
        title: "Project published",
        body: "Now visible on your Shipyard board.",
        tone: "reward",
        voice: "SUCCESS"
      });
    },
    [pushToast]
  );

  /* =========================================================
     🔐 BIOMETRIC LINK — mock sci-fi sign-in flow
     ========================================================= */

  const beginBiometricLink = useCallback(() => {
    setBiometricModalOpen(true);
    playSystemSound("CLICK");
  }, [playSystemSound]);

  const completeBiometricLink = useCallback(
    (rawCallsign) => {
      const clean =
        (rawCallsign || "")
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, "_")
          .slice(0, 18) || "CADET_SOLO_1";
      setPilotCallsign(clean);
      setIsPilotLoggedIn(true);
      localStorage.setItem("HUD_PILOT_CALLSIGN", clean);
      playSystemSound("SUCCESS");
      pushToast({
        title: "Biometric link established",
        body: `Welcome aboard, ${clean}. Neural signature bound to this cockpit.`,
        tone: "reward",
        voice: null
      });
      return clean;
    },
    [playSystemSound, pushToast]
  );

  const disconnectPilot = useCallback(() => {
    setIsPilotLoggedIn(false);
    setPilotCallsign(null);
    localStorage.removeItem("HUD_PILOT_CALLSIGN");
    playSystemSound("CLOSE");
    pushToast({
      title: "Biometric link severed",
      body: "Guest radar-link access restored. Your training progress stays saved on this device.",
      tone: "info",
      voice: null
    });
  }, [playSystemSound, pushToast]);

  /* =========================================================
     🚀 TRAVEL SEQUENCE — board shuttle → warp flight → land
     ========================================================= */

  // Committing to a sector (from Flight Academy or Space Missions) no
  // longer snaps straight into the terminal — it kicks off a staged
  // cinematic flight that <TravelSequence> drives phase-by-phase, using
  // the same persistent 3D viewport already behind every HUD screen.
  const beginPlanetTravel = useCallback(
    (sectorId) => {
      if (!sectorId) return;
      playSystemSound("CLICK");
      setTravelSequence({ active: true, phase: "BOARDING", destination: sectorId });
    },
    [playSystemSound]
  );

  const advanceTravelPhase = useCallback((phase) => {
    setTravelSequence((prev) => (prev.active ? { ...prev, phase } : prev));
  }, []);

  // Used both for the sequence's natural end and for a pilot skipping
  // ahead — either way, land straight on the destination's terminal.
  const completeTravelSequence = useCallback(() => {
    setTravelSequence((prev) => {
      if (prev.destination) {
        setSelectedLanguage(prev.destination);
        setActiveScreen("ACADEMY");
      }
      return { active: false, phase: "IDLE", destination: null };
    });
    setWarpSpeed(1);
  }, []);

  return (
    <PilotContext.Provider
      value={{
        activeScreen,
        warpSpeed,
        nightVision,
        isPilotLoggedIn,
        selectedLanguage,
        fuelCells,
        pilotProgress,
        virtualScroll,
        targetVirtualScroll,
        setTargetVirtualScroll,
        setWarpSpeed,
        setActiveScreen,
        setSelectedLanguage,
        setIsPilotLoggedIn,
        handleNavChange,
        setNightVision,
        advanceLesson,
        creditFuelCells,

        // 🆕 flight mode (Practice / Ranked / Proctored / Campus)
        pilotMode,
        setPilotMode,
        rankedRating,
        setRankedRating,
        practiceCleared,
        markPracticeCleared,
        practiceTargetIndex,
        setPracticeTargetIndex,
        battleRecord,
        recordBattleResult,

        // 🆕 salvage artifacts + Workshop projects (Phase 04)
        salvageArtifacts,
        addSalvageArtifact,
        workshopProjects,
        createWorkshopProject,
        saveWorkshopProject,
        publishWorkshopProject,

        // 🆕 avionics audio bus
        soundEnabled,
        setSoundEnabled,
        toggleSound,
        playSystemSound,

        // 🆕 canopy overlay layer
        bootComplete,
        completeBoot,
        paletteOpen,
        setPaletteOpen,
        togglePalette,
        toasts,
        pushToast,
        dismissToast,

        // 🆕 navigation helpers
        routeToScreen,
        toggleNightVision,

        // 🆕 relay streak
        flightStreak,

        // 🆕 biometric link (sign-in)
        pilotCallsign,
        biometricModalOpen,
        setBiometricModalOpen,
        beginBiometricLink,
        completeBiometricLink,
        disconnectPilot,

        // 🆕 travel sequence (board → warp → land)
        travelSequence,
        beginPlanetTravel,
        advanceTravelPhase,
        completeTravelSequence
      }}
    >
      {children}
    </PilotContext.Provider>
  );
}

export function usePilot() {
  return useContext(PilotContext);
}
