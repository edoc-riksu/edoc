"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Lock } from "lucide-react";
import Button from "../../ui/Button";
import Panel from "../../ui/Panel";
import { useAuth } from "../../context/AuthContext";
import { updateProfile } from "../../lib/authService";
import ExplorerFigure from "./ExplorerFigure";
import "./hangar.css";

const EXPLORERS = [
  { id: "vega", name: "Vega" },
  { id: "taro", name: "Taro" }
];

const SUITS = [
  { id: "base", name: "Base suit", lockedText: null },
  { id: "starfarer", name: "Starfarer set", lockedText: "Finish any module to unlock" }
];

function safeReturnTo(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export default function HangarScreen() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";

  const [tab, setTab] = useState("explorer");
  const [draftExplorer, setDraftExplorer] = useState("vega");
  const [draftSuit, setDraftSuit] = useState("base");
  const [starfarerUnlocked, setStarfarerUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setDraftExplorer(user.explorer || "vega");
    setDraftSuit(user.suit || "base");
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function checkUnlock() {
      try {
        const modulesRes = await fetch("/api/modules?planet=python", { cache: "no-store" });
        const modulesData = await modulesRes.json().catch(() => null);
        const modules = modulesData?.modules || [];
        const results = await Promise.all(
          modules.map((m) => fetch(`/api/modules/${m.slug}/progress`, { cache: "no-store" }).then((r) => r.json()).catch(() => null))
        );
        if (!cancelled) setStarfarerUnlocked(results.some((r) => r?.progress?.complete));
      } catch {
        if (!cancelled) setStarfarerUnlocked(false);
      }
    }
    checkUnlock();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const continueTo = () => router.push(safeReturnTo(searchParams.get("returnTo"), "/"));

  const handleEquip = async () => {
    setBusy(true);
    setError("");
    const result = await updateProfile({ explorer: draftExplorer, suit: draftSuit });
    setBusy(false);
    if (result.ok) {
      setUser(result.data.user);
      continueTo();
    } else {
      setError(result.data?.fields?.suit || result.data?.fields?.explorer || "Couldn't save your loadout.");
    }
  };

  return (
    <div className="hangar">
      <div className="hangar-stage">
        <p className="hangar-eyebrow">edoc // Hangar</p>
        <ExplorerFigure explorer={draftExplorer} suit={draftSuit} size={220} />
      </div>

      <Panel as="section" size="lg" className="hangar-panel">
        <div className="hangar-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "explorer"} className={`hangar-tab ${tab === "explorer" ? "is-active" : ""}`} onClick={() => setTab("explorer")}>
            Explorer
          </button>
          <button type="button" role="tab" aria-selected={tab === "suit"} className={`hangar-tab ${tab === "suit" ? "is-active" : ""}`} onClick={() => setTab("suit")}>
            Suit
          </button>
        </div>

        <div className="hangar-list">
          {tab === "explorer"
            ? EXPLORERS.map((e) => {
                const selected = draftExplorer === e.id;
                return (
                  <button key={e.id} type="button" className={`hangar-option ${selected ? "is-selected" : ""}`} onClick={() => setDraftExplorer(e.id)}>
                    <ExplorerFigure explorer={e.id} suit={draftSuit} size={48} />
                    <span className="hangar-option-name">{e.name}</span>
                    {selected && <Check size={16} className="hangar-option-check" aria-hidden="true" />}
                  </button>
                );
              })
            : SUITS.map((s) => {
                const locked = s.id === "starfarer" && !starfarerUnlocked;
                const selected = draftSuit === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`hangar-option ${selected ? "is-selected" : ""} ${locked ? "is-locked" : ""}`}
                    disabled={locked}
                    onClick={() => setDraftSuit(s.id)}
                  >
                    <ExplorerFigure explorer={draftExplorer} suit={s.id} size={48} />
                    <span className="hangar-option-name">
                      {s.name}
                      {locked && <Lock size={12} aria-hidden="true" />}
                    </span>
                    {selected && !locked && <Check size={16} className="hangar-option-check" aria-hidden="true" />}
                    {locked && <span className="hangar-option-lock-text">{s.lockedText}</span>}
                  </button>
                );
              })}
        </div>

        {error && (
          <p role="alert" className="hangar-error">
            {error}
          </p>
        )}

        <div className="hangar-actions">
          <Button size="lg" onClick={handleEquip} disabled={busy}>
            {busy ? "Saving…" : "Equip"}
          </Button>
          {!onboarding && (
            <Button variant="secondary" size="lg" onClick={() => router.back()}>
              Back
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
