"use client";
import React, { useState } from "react";
import FlightAcademy from "./modules/FlightAcademy";
import CodeTerminal from "./CodeTerminal"; // 🌟 DIRECTORY PATH FIXED: Swapped folder location to clear compile trace!
import CommLink from "./modules/CommLink";
import FuelUpgrades from "./modules/FuelUpgrades";
import SpaceMissions from "./modules/SpaceMissions";
import StarChart from "./modules/StarChart";
import CombatArray from "./modules/CombatArray";
import WarpTransitionOverlay from "./ui/WarpTransitionOverlay";
import ArcadeLevelRoadmap from "./modules/ArcadeLevelRoadmap";
import { usePilot } from "../context/PilotContext";
import { findSector, LESSON_XP } from "../lib/planetarySystem";

/**
 * 🪐 RADAR → WARP → ARCADE MISSION SELECT
 * -------------------------------------------------------------
 * Two new, purely local tracking variables own this entire flow —
 * `isWarping` and `activePlanetData` (the sector id currently being
 * warped to / mission-selected for). Nothing here reads or writes
 * pilotProgress directly; the lesson lock/complete states handed to
 * ArcadeLevelRoadmap are derived the exact same way SectorDetail.js
 * already derives them (idx < currentLevel / idx === currentLevel),
 * and launching a mission calls the same existing, untouched
 * `setPracticeTargetIndex` + `beginPlanetTravel` pair SectorDetail
 * itself uses — so lessons still unlock strictly in sequence through
 * the original locking arrays, and the lesson compiler/grading chain
 * never comes near this file.
 */
export default function HudScreens({ activeScreen, selectedLanguage, isPilotLoggedIn }) {
  const { pilotProgress, beginPlanetTravel, setPracticeTargetIndex } = usePilot();
  const [isWarping, setIsWarping] = useState(false);
  const [activePlanetData, setActivePlanetData] = useState(null); // sector id, set the moment a radar contact is engaged

  const handleEngageWarp = (sectorId) => {
    setActivePlanetData(sectorId);
    setIsWarping(true);
  };

  const handleWarpComplete = () => {
    setIsWarping(false);
    // activePlanetData stays set — its presence (with isWarping now false)
    // is what mounts the arcade roadmap below, no third state var needed.
  };

  const handleBackToGalaxy = () => {
    setActivePlanetData(null);
  };

  const handleLaunchMission = (lessonId) => {
    if (!activePlanetData) return;
    // Exactly SectorDetail's own existing lesson-launch pattern — picks the
    // target lesson index, then hands off to the already-built travel
    // sequence, which lands in CodeTerminal for that lesson.
    setPracticeTargetIndex(lessonId);
    beginPlanetTravel(activePlanetData);
    setActivePlanetData(null);
  };

  const activeSector = activePlanetData ? findSector(activePlanetData) : null;

  // Mission-select takeover — shown once the warp lands, until the pilot
  // either launches a lesson (which hands off to the real travel sequence)
  // or backs out to the radar.
  if (activeSector && !isWarping) {
    const currentLevel = pilotProgress[activeSector.id] || 0;
    const lessons = activeSector.lessons.map((lesson, idx) => ({
      id: idx,
      title: idx + 1,
      name: lesson.title,
      xpReward: LESSON_XP,
      isCompleted: idx < currentLevel,
      isUnlocked: idx <= currentLevel
    }));

    return (
      <ArcadeLevelRoadmap
        planetName={activeSector.name}
        lessons={lessons}
        onLaunchMission={handleLaunchMission}
        onBackToGalaxy={handleBackToGalaxy}
      />
    );
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case "RADAR":
        return <StarChart onEngageWarp={handleEngageWarp} />;

      case "ACADEMY":
        if (selectedLanguage) {
          return <CodeTerminal />;
        }
        return <FlightAcademy />;

      case "COMM":
        return <CommLink />;

      case "UPGRADES":
        return <FuelUpgrades />;

      case "MISSIONS":
        return <SpaceMissions />;

      case "COMBAT":
        return <CombatArray />;

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center font-mono text-slate-500 text-[11px] uppercase tracking-widest animate-pulse">
            <span>// Standby // Avionics Monitoring Stream Window Unoccupied</span>
          </div>
        );
    }
  };

  return (
    <>
      {renderScreen()}
      <WarpTransitionOverlay
        isTransitioning={isWarping}
        onComplete={handleWarpComplete}
        planetName={activeSector?.name || ""}
      />
    </>
  );
}
