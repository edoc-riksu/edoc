"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Check, LogOut, Pencil, Rocket, Shirt, UserRound, Volume2, VolumeX, X } from "lucide-react";
import AppShell from "../../shell/AppShell";
import Button from "../../ui/Button";
import Panel from "../../ui/Panel";
import AvatarBust from "./AvatarBust";
import ExitDialog from "./ExitDialog";
import { useAuth } from "../../context/AuthContext";
import { setSoundEnabled } from "../../galaxy/audio";
import { updateProfile } from "../../lib/authService";
import { resizeImageToDataUrl } from "../../lib/avatarImage";
import { normalizeCallsign, isValidCallsign, AUTH_MESSAGES } from "../../lib/authValidation";
import { conceptFor } from "../../data/concepts";
import "./profile.css";

// Every module here is on the Python planet so far (v1's one playable
// planet) - module rows link into its module list once more planets land.
const PROGRESS_PLANET_ID = "python";

// Same key/shape every other screen (Galaxy, Approach, Hangar...) reads and
// writes - this is the one place in the app a signed-in pilot was missing a
// way to flip it.
const SETTINGS_KEY = "edoc-galaxy-settings";

function loadSoundSetting() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null")?.sound !== false;
  } catch {
    return true;
  }
}

const STATS = [
  { label: "Encounters solved", key: "encountersSolved" },
  { label: "First-attempt rate", key: "firstAttemptRate" },
  { label: "Time coding", key: "timeCodingMs" },
  { label: "Hints used", key: "hintsUsed" }
];

/** "45m", "2h 5m", "2h" — whole minutes, dropping the hours part at zero. */
function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return ms > 0 ? "<1m" : "0m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

// The rest of the planned Python curriculum (plan Day 29's surface map
// names them the same way) - shown as 0-progress rows, by name only, until
// those modules are real. No invented progress for topics that don't exist.
const PLANNED_TOPICS = ["Conditions", "Loops", "Strings", "Lists", "Tuples", "Dictionaries", "Sets", "Functions", "Errors & Exceptions"];

function formatStat(key, stats) {
  if (!key || !stats) return "—";
  const value = stats[key];
  if (value === null || value === undefined) return "—";
  if (key === "firstAttemptRate") return `${Math.round(value * 100)}%`;
  if (key === "timeCodingMs") return formatDuration(value);
  return String(value);
}

/** A concept's mastery as filled-of-5 dots, scaled from its real solved/total. */
function MasteryDots({ solved, total, max = 5 }) {
  const filled = total > 0 ? Math.min(max, Math.round((solved / total) * max)) : 0;
  return (
    <span className="profile-mastery-dots" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`profile-mastery-dot ${i < filled ? "is-filled" : ""}`} />
      ))}
    </span>
  );
}

function pilotSince(createdAt) {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function ProfileScreen() {
  const { user, setUser, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const fileInputRef = useRef(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarFlipped, setAvatarFlipped] = useState(false);

  const [editingCallsign, setEditingCallsign] = useState(false);
  const [callsignDraft, setCallsignDraft] = useState("");
  const [callsignBusy, setCallsignBusy] = useState(false);
  const [callsignError, setCallsignError] = useState("");

  const [stats, setStats] = useState(null);
  const [moduleProgress, setModuleProgress] = useState(null); // null = loading, [] = none
  const [confirmExit, setConfirmExit] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(loadSoundSetting());
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {};
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...saved, sound: next }));
    } catch { }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetch("/api/auth/stats", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.stats) setStats(data.stats);
      })
      .catch(() => {});

    async function loadModuleProgress() {
      try {
        const modulesRes = await fetch("/api/modules?planet=python", { cache: "no-store" });
        const modulesData = await modulesRes.json().catch(() => null);
        const modules = modulesData?.modules || [];

        const results = await Promise.all(
          modules.map(async (m) => {
            const res = await fetch(`/api/modules/${m.slug}/progress`, { cache: "no-store" });
            const data = await res.json().catch(() => null);
            return data?.progress || null;
          })
        );
        if (!cancelled) setModuleProgress(results.filter(Boolean));
      } catch {
        if (!cancelled) setModuleProgress([]);
      }
    }
    loadModuleProgress();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;
  const since = pilotSince(user.createdAt);
  const concepts = stats?.concepts || [];

  const handleAvatarChange = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = ""; // lets the same file be picked again later
    if (!file) return;
    setAvatarError("");
    setAvatarBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const result = await updateProfile({ avatar: dataUrl });
      if (result.ok) setUser(result.data.user);
      else setAvatarError(result.data?.fields?.avatar || "Couldn't update your photo.");
    } catch (err) {
      setAvatarError(err.message || "Couldn't update your photo.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const startEditCallsign = () => {
    setCallsignDraft(user.callsign);
    setCallsignError("");
    setEditingCallsign(true);
  };

  const cancelEditCallsign = () => {
    setEditingCallsign(false);
    setCallsignError("");
  };

  const saveCallsign = async () => {
    const clean = normalizeCallsign(callsignDraft);
    if (!isValidCallsign(clean)) {
      setCallsignError(AUTH_MESSAGES.callsign);
      return;
    }
    if (clean.toLowerCase() === user.callsign.toLowerCase()) {
      setEditingCallsign(false);
      return;
    }
    setCallsignBusy(true);
    setCallsignError("");
    const result = await updateProfile({ callsign: clean });
    setCallsignBusy(false);
    if (result.ok) {
      setUser(result.data.user);
      setEditingCallsign(false);
    } else if (result.status === 409) {
      setCallsignError("That callsign is already taken.");
    } else {
      setCallsignError(result.data?.fields?.callsign || "Couldn't update your callsign.");
    }
  };

  const handleCallsignKeyDown = (ev) => {
    if (ev.key === "Enter") saveCallsign();
    else if (ev.key === "Escape") cancelEditCallsign();
  };

  const handleSignOutClick = () => {
    if (signingOut) return;
    setConfirmExit(true);
  };

  const confirmSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.push("/signin");
  };

  return (
    <AppShell
      section="PILOT PROFILE"
      tools={
        <>
          <Button
            variant="secondary"
            iconOnly
            icon={soundOn ? Volume2 : VolumeX}
            pressed={soundOn}
            aria-label={soundOn ? "Mute sound" : "Turn sound on"}
            onClick={toggleSound}
          />
          <Button variant="secondary" iconOnly icon={Shirt} href="/hangar" aria-label="Open the Lobby" />
          <Button variant="secondary" iconOnly icon={Rocket} href="/" aria-label="Back to the galaxy" />
          <Button variant="secondary" iconOnly icon={LogOut} aria-label="Sign out" disabled={signingOut} onClick={handleSignOutClick} />
        </>
      }
    >
      <div className="profile-grid">
        <Panel as="section" size="lg" className="profile-identity">
          <div className="profile-avatar-wrap">
            <button
              type="button"
              className={`profile-avatar ${avatarFlipped ? "is-flipped" : ""} ${avatarBusy ? "is-busy" : ""}`}
              onClick={() => setAvatarFlipped((v) => !v)}
              disabled={avatarBusy}
              aria-label={avatarFlipped ? "Showing your photo. Click to show your explorer." : "Showing your explorer. Click to show your photo."}
            >
              <span className="profile-avatar-flip" aria-hidden="true">
                <span className="profile-avatar-face profile-avatar-face--front">
                  <AvatarBust explorer={user.explorer || "vega"} width={150} height={256} />
                </span>
                <span className="profile-avatar-face profile-avatar-face--back">
                  {user.avatar ? <img src={user.avatar} alt="" className="profile-avatar-img" /> : <UserRound size={40} aria-hidden="true" />}
                </span>
              </span>
            </button>
            <button
              type="button"
              className="profile-avatar-edit"
              onClick={(ev) => {
                ev.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={avatarBusy}
              aria-label="Change profile photo"
            >
              <Camera size={13} />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="profile-avatar-input" onChange={handleAvatarChange} />
          {avatarError && (
            <p className="profile-field-error" role="alert">
              {avatarError}
            </p>
          )}

          {editingCallsign ? (
            <div className="profile-callsign-edit">
              <input
                className="profile-callsign-input"
                value={callsignDraft}
                onChange={(ev) => setCallsignDraft(ev.target.value)}
                onKeyDown={handleCallsignKeyDown}
                maxLength={20}
                autoFocus
                disabled={callsignBusy}
                aria-label="Callsign"
                aria-invalid={callsignError ? "true" : undefined}
                aria-describedby={callsignError ? "profile-callsign-error" : undefined}
              />
              <button type="button" className="profile-callsign-btn" onClick={saveCallsign} disabled={callsignBusy} aria-label="Save callsign">
                <Check size={15} />
              </button>
              <button type="button" className="profile-callsign-btn" onClick={cancelEditCallsign} disabled={callsignBusy} aria-label="Cancel editing">
                <X size={15} />
              </button>
            </div>
          ) : (
            <h2 className="profile-callsign">
              {user.callsign}
              <button type="button" className="profile-callsign-pencil" onClick={startEditCallsign} aria-label="Edit callsign">
                <Pencil size={14} />
              </button>
            </h2>
          )}
          {callsignError && (
            <p id="profile-callsign-error" className="profile-field-error" role="alert">
              {callsignError}
            </p>
          )}
          {since && <p className="t-small t-muted">Pilot since {since}</p>}
          <span className="profile-equipped">Equipped: {user.suit === "starfarer" ? "Starfarer suit" : "Base suit"}</span>
        </Panel>

        <div className="profile-stats">
          {STATS.map((s) => (
            <Panel key={s.label} size="sm" className="profile-stat">
              <p className="t-label">{s.label}</p>
              <p className="profile-stat-value">{formatStat(s.key, stats)}</p>
            </Panel>
          ))}
        </div>

        <Panel as="section" size="lg" title="Python progress" className="profile-progress">
          {moduleProgress === null ? (
            <p className="t-body">Loading progress…</p>
          ) : (
            <div className="profile-progress-list">
              {moduleProgress.map((m) => {
                const pct = m.totalCount ? Math.round((m.solvedCount / m.totalCount) * 100) : 0;
                return (
                  <Link key={m.slug} href={`/planet/${PROGRESS_PLANET_ID}/modules/${m.slug}`} className="profile-progress-row">
                    <span className="profile-progress-label">{m.title}</span>
                    <span className="profile-progress-track">
                      <span className="profile-progress-fill" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="profile-progress-count">
                      {m.solvedCount}/{m.totalCount}
                    </span>
                  </Link>
                );
              })}
              {PLANNED_TOPICS.map((title) => (
                <div key={title} className="profile-progress-row is-locked">
                  <span className="profile-progress-label">{title}</span>
                  <span className="profile-progress-track">
                    <span className="profile-progress-fill" style={{ width: "0%" }} />
                  </span>
                  <span className="profile-progress-count">Soon</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel as="section" size="lg" title="Concept mastery" className="profile-mastery">
          {stats === null ? (
            <p className="t-body">Loading…</p>
          ) : concepts.length > 0 ? (
            <div className="profile-concepts">
              {concepts.map((c) => {
                const info = conceptFor(c.concept);
                const mastered = c.total > 0 && c.solved === c.total;
                return (
                  <span
                    key={c.concept}
                    className={`profile-concept-chip ${mastered ? "is-mastered" : ""}`}
                    aria-label={`${info.name}: ${c.solved} of ${c.total} solved`}
                  >
                    <span className="profile-concept-name">{info.name}</span>
                    <MasteryDots solved={c.solved} total={c.total} />
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="t-body">No concepts taught yet.</p>
          )}
        </Panel>
      </div>
      {confirmExit && <ExitDialog onStay={() => setConfirmExit(false)} onExit={confirmSignOut} exiting={signingOut} />}
    </AppShell>
  );
}
