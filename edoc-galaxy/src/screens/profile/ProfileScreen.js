"use client";

import { useRef, useState } from "react";
import { Camera, Check, Pencil, Rocket, UserRound, X } from "lucide-react";
import AppShell from "../../shell/AppShell";
import Button from "../../ui/Button";
import Panel from "../../ui/Panel";
import { useAuth } from "../../context/AuthContext";
import { updateProfile } from "../../lib/authService";
import { resizeImageToDataUrl } from "../../lib/avatarImage";
import { normalizeCallsign, isValidCallsign, AUTH_MESSAGES } from "../../lib/authValidation";
import { APPROACH } from "../../data/approach";
import "./profile.css";

const STATS = [
  { label: "Encounters solved" },
  { label: "First-attempt rate" },
  { label: "Time coding" },
  { label: "Hints used" }
];

function pilotSince(createdAt) {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

// Concepts pulled from the real encounter data — not invented. Mastery
// tracking per concept doesn't exist yet (see delivery plan, week 6), so
// this just lists what's taught so far rather than faking a score.
function knownConcepts() {
  const names = new Set();
  Object.values(APPROACH).forEach((planet) => {
    planet.encounters.forEach((e) => {
      if (e.concept?.name) names.add(e.concept.name);
    });
  });
  return Array.from(names);
}

export default function ProfileScreen() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [editingCallsign, setEditingCallsign] = useState(false);
  const [callsignDraft, setCallsignDraft] = useState("");
  const [callsignBusy, setCallsignBusy] = useState(false);
  const [callsignError, setCallsignError] = useState("");

  if (!user) return null;
  const since = pilotSince(user.createdAt);
  const concepts = knownConcepts();

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

  return (
    <AppShell section="PILOT PROFILE" tools={<Button variant="secondary" iconOnly icon={Rocket} href="/" aria-label="Back to the galaxy" />}>
      <div className="profile-grid">
        <Panel as="section" size="lg" className="profile-identity">
          <button
            type="button"
            className={`profile-avatar ${avatarBusy ? "is-busy" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarBusy}
            aria-label="Change profile photo"
          >
            {user.avatar ? <img src={user.avatar} alt="" className="profile-avatar-img" /> : <UserRound size={40} aria-hidden="true" />}
            <span className="profile-avatar-edit" aria-hidden="true">
              <Camera size={13} />
            </span>
          </button>
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
              />
              <button type="button" className="profile-callsign-btn" onClick={saveCallsign} disabled={callsignBusy} aria-label="Save callsign">
                <Check size={15} />
              </button>
              <button type="button" className="profile-callsign-btn" onClick={cancelEditCallsign} disabled={callsignBusy} aria-label="Cancel editing">
                <X size={15} />
              </button>
            </div>
          ) : (
            <h1 className="profile-callsign">
              {user.callsign}
              <button type="button" className="profile-callsign-pencil" onClick={startEditCallsign} aria-label="Edit callsign">
                <Pencil size={14} />
              </button>
            </h1>
          )}
          {callsignError && (
            <p className="profile-field-error" role="alert">
              {callsignError}
            </p>
          )}
          {since && <p className="t-small t-muted">Pilot since {since}</p>}
        </Panel>

        <div className="profile-stats">
          {STATS.map((s) => (
            <Panel key={s.label} size="sm" className="profile-stat">
              <p className="t-label">{s.label}</p>
              <p className="profile-stat-value">—</p>
            </Panel>
          ))}
        </div>

        <Panel as="section" size="lg" title="Python progress" className="profile-progress">
          <p className="t-body">
            Module-by-module progress shows here once modules and saved progress exist — tracked from day one, shown once it's real.
          </p>
        </Panel>

        <Panel as="section" size="lg" title="Concept mastery" className="profile-mastery">
          {concepts.length > 0 ? (
            <div className="profile-concepts">
              {concepts.map((c) => (
                <span key={c} className="profile-concept-chip">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="t-body">No concepts taught yet.</p>
          )}
          <p className="t-small t-muted profile-concepts-note">Mastery per concept starts tracking once attempts are recorded.</p>
        </Panel>
      </div>
    </AppShell>
  );
}
