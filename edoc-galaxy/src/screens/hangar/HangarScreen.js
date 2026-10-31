"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Rocket, Shirt, User } from "lucide-react";
import Button from "../../ui/Button";
import Panel from "../../ui/Panel";
import { useAuth } from "../../context/AuthContext";
import { updateProfile } from "../../lib/authService";
import { setSoundEnabled } from "../../galaxy/audio";
import HangarScene from "./HangarScene";
import SuitCard from "./SuitCard";
import ExplorerPortrait from "./ExplorerPortrait";
import { getCardVisualState, getEquipButtonState, getUnlockDetail } from "./hangarLogic";
import "./hangar.css";

// Taglines are flavour copy, not game data — the two explorers are cosmetic
// only, with no real stats or abilities behind them, so nothing here is
// presented as a tracked number (see profile.js's same rule for real stats).
const EXPLORERS = [
  { id: "vega", name: "Male", tagline: "Steady hands, quick to adapt." },
  { id: "taro", name: "Female", tagline: "Sharp focus, calm under pressure." }
];

const SUITS = [
  { id: "base", name: "Base suit" },
  { id: "starfarer", name: "Starfarer set" }
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
  const [moduleStats, setModuleStats] = useState(null); // {done, total}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const tabRefs = useRef([]);
  const cardRefs = useRef([]);

  useEffect(() => {
    if (!user) return;
    setDraftExplorer(user.explorer || "vega");
    setDraftSuit(user.suit || "base");
  }, [user]);

  useEffect(() => {
    try {
      const s = { sound: true, ...(JSON.parse(localStorage.getItem("edoc-galaxy-settings") || "null") || {}) };
      setSoundEnabled(s.sound);
    } catch {}
  }, []);

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
        if (!cancelled) {
          const doneCount = results.filter((r) => r?.progress?.complete).length;
          setStarfarerUnlocked(doneCount > 0);
          setModuleStats({ done: doneCount, total: modules.length });
        }
      } catch {
        if (!cancelled) setStarfarerUnlocked(false);
      }
    }
    checkUnlock();
    return () => {
      cancelled = true;
    };
  }, []);

  const say = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const continueTo = useCallback(() => router.push(safeReturnTo(searchParams.get("returnTo"), "/")), [router, searchParams]);
  const goBack = useCallback(() => (onboarding ? continueTo() : router.back()), [onboarding, continueTo, router]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  if (!user) return null;

  const previewLocked = draftSuit === "starfarer" && !starfarerUnlocked;
  const previewMatchesEquipped = draftExplorer === (user.explorer || "vega") && draftSuit === (user.suit || "base");
  const equipState = getEquipButtonState({ previewLocked, previewMatchesEquipped });
  const unlockDetail = getUnlockDetail(moduleStats);

  const handleEquip = async () => {
    if (equipState.disabled) return;
    setBusy(true);
    setError("");
    const prevUser = user;
    setUser({ ...user, explorer: draftExplorer, suit: draftSuit }); // optimistic
    const result = await updateProfile({ explorer: draftExplorer, suit: draftSuit });
    setBusy(false);
    if (result.ok) {
      setUser(result.data.user);
      const suitName = SUITS.find((s) => s.id === draftSuit)?.name || "Loadout";
      say(`${suitName} equipped`);
      if (onboarding) continueTo();
    } else {
      setUser(prevUser); // revert
      setError(result.data?.fields?.suit || result.data?.fields?.explorer || "Couldn't save your loadout.");
    }
  };

  const loadingSuits = tab === "suit" && moduleStats === null;
  const tileIcon = tab === "explorer" ? User : Shirt;

  const items =
    tab === "explorer"
      ? EXPLORERS.map((e) => ({
          id: e.id,
          name: e.name,
          locked: false,
          isEquipped: e.id === (user.explorer || "vega"),
          isPreviewed: e.id === draftExplorer,
          subtitle: "Select to switch explorer",
          portrait: <ExplorerPortrait explorer={e.id} />,
          onSelect: () => setDraftExplorer(e.id)
        }))
      : SUITS.map((s) => {
          const locked = s.id === "starfarer" && !starfarerUnlocked;
          return {
            id: s.id,
            name: s.name,
            locked,
            isEquipped: s.id === (user.suit || "base"),
            isPreviewed: s.id === draftSuit,
            subtitle: "Select to switch suit",
            // Locked suits can still be previewed in the scene — only Equip is
            // blocked (handled by equipState below).
            onSelect: () => setDraftSuit(s.id)
          };
        });

  const currentIndex = items.findIndex((it) => it.isPreviewed);
  const cycleItem = (dir) => {
    const next = (currentIndex + dir + items.length) % items.length;
    items[next]?.onSelect();
  };
  const previewedExplorer = EXPLORERS.find((e) => e.id === draftExplorer);
  const previewedSuit = SUITS.find((s) => s.id === draftSuit);

  const handleTabKeyDown = (e, index) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = index === 0 ? 1 : 0;
    setTab(next === 0 ? "explorer" : "suit");
    tabRefs.current[next]?.focus();
  };

  const handleCardKeyDown = (e, index) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const next = (index + dir + items.length) % items.length;
    // Standard radiogroup behaviour: arrow keys move the selection, not just
    // focus (same as native <input type="radio">).
    items[next]?.onSelect();
    cardRefs.current[next]?.focus();
  };

  return (
    <div className="hg">
      <div className="hg-scene">
        <HangarScene
          explorer={draftExplorer}
          suit={draftSuit}
          onPilotPick={() => {
            setDraftExplorer(draftExplorer === "vega" ? "taro" : "vega");
            setTab("explorer");
          }}
          onSuitPick={(suitId) => {
            setDraftSuit(suitId);
            setTab("suit");
          }}
        />
      </div>

      <header className="hg-top">
        <div className="hg-crumb">
          <Link href="/" className="t-display hg-wordmark">
            edoc
          </Link>
          <span className="hg-slash" aria-hidden="true">
            /
          </span>
          <h1 className="hg-crumb-now">Hangar</h1>
        </div>
        <div className="hg-tools">
          <Button variant="secondary" iconOnly icon={User} aria-label="Open profile" onClick={() => router.push("/profile")} />
          <Button variant="secondary" iconOnly icon={Rocket} aria-label="Back to the galaxy" onClick={goBack} />
        </div>
      </header>

      <Panel
        as="section"
        size="md"
        className={`hg-panel ${loadingSuits ? "is-loading" : ""}`}
        eyebrow="Loadout"
        title={tab === "explorer" ? "Explorer" : "Suit"}
        aria-label="Loadout"
      >
        <div className="hg-tabs" role="tablist" aria-label="Loadout category">
          {["explorer", "suit"].map((t, i) => (
            <button
              key={t}
              ref={(el) => (tabRefs.current[i] = el)}
              type="button"
              role="tab"
              id={`hg-tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`hg-tabpanel-${t}`}
              tabIndex={tab === t ? 0 : -1}
              className={`hg-tab ${tab === t ? "is-active" : ""}`}
              onClick={() => setTab(t)}
              onKeyDown={(e) => handleTabKeyDown(e, i)}
            >
              {t === "explorer" ? "Explorer" : "Suit"}
            </button>
          ))}
        </div>

        {!loadingSuits && (
          <div className="hg-charinfo">
            <p className="hg-charinfo-name">{tab === "explorer" ? previewedExplorer?.name : previewedSuit?.name}</p>
            {tab === "explorer" && previewedExplorer?.tagline && <p className="hg-charinfo-tagline">{previewedExplorer.tagline}</p>}
            <p className="hg-charinfo-sub">Wearing: {previewedSuit?.name}</p>
          </div>
        )}

        <div className="hg-nav" role="group" aria-label={`Browse ${tab === "explorer" ? "explorers" : "suits"}`}>
          <button type="button" className="hg-nav-arrow" onClick={() => cycleItem(-1)} aria-label={`Previous ${tab === "explorer" ? "explorer" : "suit"}`}>
            <ChevronLeft size={18} />
          </button>
          <span className="hg-nav-count">
            {currentIndex + 1} / {items.length}
          </span>
          <button type="button" className="hg-nav-arrow" onClick={() => cycleItem(1)} aria-label={`Next ${tab === "explorer" ? "explorer" : "suit"}`}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div
          className="hg-list"
          role="radiogroup"
          aria-label={tab === "explorer" ? "Explorers" : "Suits"}
          id={`hg-tabpanel-${tab}`}
          aria-labelledby={`hg-tab-${tab}`}
        >
          {loadingSuits
            ? [0, 1].map((i) => <div key={i} className="hg-card hg-card--skeleton" aria-hidden="true" />)
            : items.map((it, i) => {
                const state = getCardVisualState({ locked: it.locked, isEquipped: it.isEquipped, isPreviewed: it.isPreviewed });
                return (
                  <SuitCard
                    key={it.id}
                    ref={(el) => (cardRefs.current[i] = el)}
                    id={it.id}
                    name={it.name}
                    icon={tileIcon}
                    portrait={it.portrait}
                    state={state}
                    unlockDetail={unlockDetail}
                    subtitle={it.subtitle}
                    tabIndex={it.isPreviewed ? 0 : -1}
                    onSelect={it.onSelect}
                    onKeyDown={(e) => handleCardKeyDown(e, i)}
                  />
                );
              })}
        </div>

        {error && (
          <p role="alert" className="hg-error">
            {error}
          </p>
        )}

        <div className="hg-actions">
          <Button size="lg" full onClick={handleEquip} disabled={equipState.disabled || busy} aria-describedby={equipState.locked ? "hg-unlock-hint" : undefined}>
            {busy
              ? "Saving…"
              : equipState.label === "Equip"
                ? tab === "explorer"
                  ? "Confirm Explorer"
                  : "Equip Suit"
                : equipState.label}
          </Button>
          <Button variant="secondary" size="lg" full onClick={goBack}>
            Back
          </Button>
        </div>
        {equipState.locked && (
          <p id="hg-unlock-hint" className="hg-sr-only">
            Unlock: {unlockDetail}
          </p>
        )}
      </Panel>

      <div className={`hg-toast ${toast ? "is-on" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
