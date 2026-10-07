"use client";
import React, { useMemo, useState } from "react";
import { usePilot } from "../../context/PilotContext";
import {
  PLANETARY_SYSTEM,
  sectorMastery,
  fleetMastery,
  coreLessonCount
} from "../../lib/planetarySystem";
import { mockCampusSection, mockCampusRoster, mockCampusAssignment, buildMasteryHeatmap } from "../../lib/campusModel";
import { hashSeed } from "../../lib/commsFeed";
import { GraduationCap, Users, ClipboardList, CalendarClock, Info, ShieldCheck } from "lucide-react";

/**
 * 🏫 CAMPUS DASHBOARD — Non-Negotiables-adjacent follow-up, built directly
 * on the data model Phase 02 shipped (src/lib/campusModel.js) but never
 * rendered. A real instructor account + roster + LMS grade passback still
 * don't exist, so this stays a demo section (4 mock classmates seeded
 * deterministically, same pattern as the Comm-Link's showcase stats) — but
 * the mastery heatmap, the class average, and the assignment completion
 * count are all computed with the SAME real functions (`sectorMastery`,
 * `fleetMastery`, `coreLessonCount`) the rest of the app uses, not fake
 * numbers. When a pilot has linked a callsign, their own real
 * `pilotProgress` is folded into the roster as a live row, so the heatmap
 * genuinely reflects at least one real pilot's real training.
 */

// Deterministic (non-random) mock level for a demo classmate in a given
// sector — seeded the same way showcaseStats() seeds its numbers, so a
// reload always shows the same demo roster instead of reshuffling.
function mockLevelFor(pilotId, sector) {
  return hashSeed(`${pilotId}::${sector.id}`) % (sector.totalLessons + 1);
}

function mockProgressFor(pilotId) {
  const progress = {};
  PLANETARY_SYSTEM.forEach((sector) => {
    progress[sector.id] = mockLevelFor(pilotId, sector);
  });
  return progress;
}

const STATUS_STYLE = {
  active: "text-emerald-400 bg-emerald-950/30 border-emerald-500/30",
  invited: "text-amber-400 bg-amber-950/30 border-amber-500/30",
  inactive: "text-slate-500 bg-slate-900/40 border-slate-800"
};

function masteryTone(percent) {
  if (percent >= 75) return "#34d399";
  if (percent >= 40) return "#2dd4ee";
  if (percent > 0) return "#8291ac";
  return "#334155";
}

export default function CampusDashboard() {
  const { pilotProgress, pilotCallsign } = usePilot();
  const [selectedPilotId, setSelectedPilotId] = useState(null);

  const section = useMemo(() => mockCampusSection(), []);
  const mockRoster = useMemo(() => mockCampusRoster(), []);
  const assignment = useMemo(() => mockCampusAssignment(), []);
  const sectorIds = useMemo(() => PLANETARY_SYSTEM.map((s) => s.id), []);

  // Fold the actual linked pilot in as a real, live roster row — everyone
  // else here is illustrative demo data (see the header disclaimer below).
  const roster = useMemo(() => {
    if (!pilotCallsign) return mockRoster;
    return [...mockRoster, { pilotId: "__you__", callsign: pilotCallsign, sectionId: section.id, status: "active" }];
  }, [mockRoster, pilotCallsign, section.id]);

  const progressByPilot = useMemo(() => {
    const map = {};
    mockRoster.forEach((entry) => {
      map[entry.pilotId] = mockProgressFor(entry.pilotId);
    });
    if (pilotCallsign) map.__you__ = pilotProgress;
    return map;
  }, [mockRoster, pilotCallsign, pilotProgress]);

  const heatmap = useMemo(
    () => buildMasteryHeatmap(roster, progressByPilot, sectorMastery, sectorIds),
    [roster, progressByPilot, sectorIds]
  );

  const cellFor = (pilotId, sectorId) => heatmap.find((c) => c.pilotId === pilotId && c.sectorId === sectorId);

  const classAverage = useMemo(() => {
    if (roster.length === 0) return 0;
    const total = roster.reduce((sum, entry) => sum + fleetMastery(progressByPilot[entry.pilotId] || {}), 0);
    return Math.round(total / roster.length);
  }, [roster, progressByPilot]);

  const assignmentSector = PLANETARY_SYSTEM.find((s) => s.id === assignment.sectorId);
  const assignmentTarget = assignmentSector
    ? assignment.moduleScope === "core"
      ? coreLessonCount(assignmentSector)
      : assignmentSector.totalLessons
    : 0;
  const assignmentCompletedCount = roster.filter(
    (entry) => (progressByPilot[entry.pilotId]?.[assignment.sectorId] || 0) >= assignmentTarget
  ).length;

  const selectedEntry = roster.find((r) => r.pilotId === selectedPilotId) || null;
  const selectedProgress = selectedEntry ? progressByPilot[selectedEntry.pilotId] || {} : null;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* DEMO-DATA DISCLAIMER — honest about scope: real dashboard mechanics,
          illustrative roster (no instructor account / LMS integration exists). */}
      <div className="scope-frame scope-frame-sm px-3 py-2 border border-slate-800 bg-slate-950/30 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
          Demo section — <span className="text-slate-400 font-semibold">{section.instructorName}</span>'s roster below is illustrative (no instructor account or LMS grade passback exists yet), but every mastery number is computed live from the same fleet-mastery logic the rest of the platform uses.
          {pilotCallsign ? (
            <>
              {" "}
              Your own row (<span className="text-cyan-400 font-semibold">{pilotCallsign}</span>) reflects your real training.
            </>
          ) : (
            <> Link a callsign via Biometric Link to see your own real mastery folded into this roster.</>
          )}
        </p>
      </div>

      {/* SECTION HEADER + CLASS AVERAGE */}
      <div className="scope-frame p-4 border border-slate-800 bg-slate-950/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-cyan-500/30 rounded-full bg-cyan-950/20 text-cyan-400 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-scope text-sm font-semibold uppercase tracking-wide text-slate-100">{section.name}</h2>
            <p className="text-[10px] text-slate-500 font-sans flex items-center gap-1.5">
              <Users className="w-3 h-3" /> {roster.length} pilots enrolled &middot; instructor {section.instructorName}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <div className="font-scope text-2xl font-bold text-cyan-400 tabular-nums">{classAverage}%</div>
          <div className="text-[9px] text-slate-500 font-sans uppercase tracking-wide">Class avg. fleet mastery</div>
        </div>
      </div>

      {/* ASSIGNMENT CARD */}
      <div className="scope-frame p-4 border border-slate-800 bg-slate-950/20 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />
          <h3 className="font-scope text-[11px] font-semibold uppercase tracking-wide text-slate-200">{assignment.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-sans">
          <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Due {new Date(assignment.dueAt).toLocaleDateString()}</span>
          <span>Target: {assignmentSector?.short} &middot; {assignment.moduleScope === "core" ? "Core module" : "Applied module"} ({assignmentTarget} exercises)</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-slate-900 border border-slate-800/60 rounded-xs overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${roster.length ? (assignmentCompletedCount / roster.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">{assignmentCompletedCount}/{roster.length} complete</span>
        </div>
      </div>

      {/* MASTERY HEATMAP */}
      <div className="scope-frame p-4 border border-slate-800 bg-slate-950/20 overflow-x-auto">
        <h3 className="font-scope text-[11px] font-semibold uppercase tracking-wide text-slate-200 mb-3">Class Mastery Heatmap</h3>
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead>
            <tr>
              <th className="text-[9px] text-slate-500 font-sans uppercase tracking-wide pb-2 pr-3 font-normal">Pilot</th>
              <th className="text-[9px] text-slate-500 font-sans uppercase tracking-wide pb-2 pr-3 font-normal">Status</th>
              {PLANETARY_SYSTEM.map((s) => (
                <th key={s.id} className="text-[9px] font-mono uppercase tracking-wide pb-2 px-1 font-normal text-center" style={{ color: s.hex }} title={s.name}>
                  {s.short}
                </th>
              ))}
              <th className="text-[9px] text-slate-500 font-sans uppercase tracking-wide pb-2 pl-2 font-normal text-right">Fleet</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((entry) => {
              const isYou = entry.pilotId === "__you__";
              const overall = fleetMastery(progressByPilot[entry.pilotId] || {});
              return (
                <tr
                  key={entry.pilotId}
                  onClick={() => setSelectedPilotId(entry.pilotId === selectedPilotId ? null : entry.pilotId)}
                  className={`border-t border-slate-900/80 cursor-pointer hover:bg-slate-900/30 transition-colors ${isYou ? "bg-cyan-950/10" : ""}`}
                >
                  <td className="py-1.5 pr-3 text-[11px] font-mono text-slate-200 whitespace-nowrap">
                    {entry.callsign}
                    {isYou && <span className="ml-1.5 text-[9px] text-cyan-400 font-scope uppercase tracking-wide">You</span>}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={`text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border ${STATUS_STYLE[entry.status]}`}>
                      {entry.status}
                    </span>
                  </td>
                  {PLANETARY_SYSTEM.map((s) => {
                    const cell = cellFor(entry.pilotId, s.id);
                    const pct = cell ? cell.masteryPercent : 0;
                    return (
                      <td key={s.id} className="py-1.5 px-1 text-center">
                        <div
                          className="mx-auto w-9 h-6 flex items-center justify-center rounded text-[9px] font-mono tabular-nums"
                          style={{ backgroundColor: `${masteryTone(pct)}${pct > 0 ? "33" : "1a"}`, color: masteryTone(pct) }}
                          title={`${s.name}: ${pct}%`}
                        >
                          {pct}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-1.5 pl-2 text-right text-[11px] font-mono tabular-nums text-slate-300">{overall}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SELECTED PILOT DRILL-DOWN */}
      {selectedEntry && selectedProgress && (
        <div className="scope-frame scope-frame-sm p-3 border border-cyan-500/30 bg-cyan-950/10 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <h4 className="font-scope text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
              {selectedEntry.callsign} — per-sector breakdown
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLANETARY_SYSTEM.map((s) => {
              const level = selectedProgress[s.id] || 0;
              return (
                <div key={s.id} className="flex items-center justify-between text-[10px] font-mono px-2 py-1 bg-slate-950/40 border border-slate-800/60 rounded">
                  <span style={{ color: s.hex }}>{s.short}</span>
                  <span className="text-slate-400 tabular-nums">{level}/{s.totalLessons}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
