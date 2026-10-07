"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { usePilot } from "../../context/PilotContext";
import { PLANETARY_SYSTEM, sectorMastery, fleetMastery, TRACKS, trackCertificate, languageCertificateEarned } from "../../lib/planetarySystem";
import { SEED_POSTS, CHANNELS, IMAGE_PRESETS, avatarHue, hashSeed, timeAgo, bioFor, followerCount, followingCount } from "../../lib/commsFeed";
import { GUIDED_BUILDS, isGuidedBuildUnlocked } from "../../lib/projects";
import Workshop from "./Workshop";
import {
  User,
  Trophy,
  Rocket,
  FileText,
  Activity,
  Award,
  Lock as LockIcon,
  Target,
  Radio,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Hash,
  ChevronLeft,
  UserPlus,
  UserCheck,
  ShieldCheck,
  Flame,
  Wrench,
  PlusCircle,
  Code2,
  Package
} from "lucide-react";

// Monthly fleet-wide challenge rotation — a Comm-Link-native counterpart to
// the personal Relay Log streak over in Space Missions. This one is a
// shared cycle challenge instead of a per-pilot daily counter.
const CHALLENGE_ROTATION = [
  {
    title: "Any Subject Challenge",
    sector: "Any Subject",
    brief: "Submit a working solution for any lesson this month."
  },
  {
    title: "JavaScript Challenge",
    sector: "JavaScript Engine",
    brief: "Chain three async steps together with no errors."
  },
  {
    title: "Rust Challenge",
    sector: "Rust Core Defense",
    brief: "Write a Rust solution with no unsafe code."
  },
  {
    title: "SQL Challenge",
    sector: "SQL Relational Matrix",
    brief: "Fix a broken join across three tables."
  }
];

// 🖥️ CAP LOG — static flavor lines for the scrolling engine-status ticker
// above the feed. Purely decorative readout text, not derived from or
// written back to any real system/build state.
const ENGINE_STATUS_LOG = [
  "SYS_LOG // Cap Log relay synchronized — fleet channel nominal.",
  "ENGINE // Compiler core temperature within tolerance.",
  "RELEASE // Patch 4.12 — hint system latency reduced fleet-wide.",
  "ENGINE // Telemetry uplink steady across all sectors.",
  "RELEASE // Patch 4.11 — Shipyard salvage indexing improved.",
  "SYS_LOG // Comm-Link channel roster refreshed.",
  "ENGINE // Auxiliary power reserves nominal.",
  "RELEASE // Patch 4.10 — Ranked ladder rating curve rebalanced."
];

const CHALLENGE_STANDINGS = [
  { callsign: "Commander_Py", entry: "Recursive Fix", votes: 214 },
  { callsign: "Star_Compiler", entry: "Fast Rust Solution", votes: 178 },
  { callsign: "Byte_Nebula", entry: "SQL Fix Script", votes: 133 },
  { callsign: "Vector_Ghost", entry: "Async Fix", votes: 96 }
];

// A stable (hash-based, not Math.random()) "N likes / N comments" flavor
// pair for shipyard builds — same deterministic-number pattern already
// used for SectorDetail's "pilots training" stat.
function showcaseStats(seed) {
  const h = hashSeed(seed);
  // Bug fix (Phase 04): a signed `>>` on a hash that can exceed 2^31 flips
  // negative under JS's Int32 coercion, which silently produced negative
  // "comment" counts for some seeds (surfaced by the new workshop_/salvage_
  // id prefixes). `>>>` (unsigned shift) keeps this non-negative always.
  return { likes: 20 + (h % 60), comments: 3 + ((h >>> 3) % 14) };
}

// 🪪 PILOT AVATAR CHIP — every callsign gets a stable hue (hashed, not
// random) so the same pilot always renders the same color across the
// leaderboard, the feed and the profile hero, with no image asset needed.
function PilotAvatar({ callsign, size = "md" }) {
  const hue = avatarHue(callsign || "GUEST");
  const initials = (callsign || "??").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "PL";
  const dims = size === "sm" ? "w-7 h-7 text-[9px]" : size === "lg" ? "w-14 h-14 text-base" : "w-9 h-9 text-[11px]";
  return (
    <div
      className={`${dims} rounded-full border flex items-center justify-center shrink-0 font-scope font-bold`}
      style={{
        borderColor: `hsla(${hue}, 70%, 55%, 0.5)`,
        background: `linear-gradient(135deg, hsla(${hue}, 70%, 25%, 0.9), hsla(${hue}, 70%, 12%, 0.9))`,
        color: `hsl(${hue}, 85%, 72%)`
      }}
    >
      {initials}
    </div>
  );
}

// 📰 POST CARD — the same transmission renders two ways: a clickable
// summary inside the feed, and the pinned "expanded" version at the top
// of its own thread page. `expanded` just turns off the click-to-open
// behavior and keeps the comment thread permanently unfurled.
function PostCard({
  post,
  expanded = false,
  isCommentsOpen,
  commentDraft,
  myCallsign,
  onOpenDetail,
  onToggleLike,
  onToggleComments,
  onShare,
  onDraftChange,
  onSubmitComment,
  onToggleCommentLike
}) {
  const preset = post.image ? IMAGE_PRESETS.find((ip) => ip.id === post.image) : null;
  const showComments = expanded || isCommentsOpen;

  return (
    <div className="relative scope-frame pl-4 pr-4 py-4 border-l-2 border-emerald-500/40 border-y border-r border-slate-800/50 bg-black/40 backdrop-blur-xs hover:border-l-emerald-400/70 transition-colors duration-300 font-mono">
      <span className="pointer-events-none absolute left-1.5 top-4 text-emerald-500/50 text-[11px] select-none">&gt;</span>
      <div className="flex items-start gap-3">
        <button onClick={() => onOpenDetail(post.id)} className="cursor-pointer shrink-0">
          <PilotAvatar callsign={post.author} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => onOpenDetail(post.id)} className="font-scope text-[12px] font-bold text-slate-200 hover:text-emerald-400 transition-colors cursor-pointer">
              {post.author}
            </button>
            <span className="text-[10px] text-slate-600">@{post.author.toLowerCase()}</span>
            <span className="text-[10px] text-slate-600">·</span>
            <span className="text-[10px] text-emerald-500/70 font-mono">{timeAgo(post.createdAt)}</span>
            <span className="ml-auto px-1.5 py-0.5 bg-slate-900/80 border border-emerald-800/50 text-[8px] rounded-xs text-emerald-400 font-black uppercase tracking-wider">#{post.channel}</span>
          </div>

          <div onClick={() => !expanded && onOpenDetail(post.id)} className={!expanded ? "cursor-pointer" : ""}>
            {post.title && <h3 className="font-scope text-[13px] font-semibold text-slate-100 mt-1.5">{post.title}</h3>}
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-1 whitespace-pre-line">{post.body}</p>
          </div>

          {preset && (
            <div
              onClick={() => !expanded && onOpenDetail(post.id)}
              className={`mt-2.5 rounded-sm overflow-hidden border border-slate-800 relative h-40 ${!expanded ? "cursor-pointer" : ""}`}
              style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
            >
              <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none" />
              <div className="absolute bottom-1.5 left-2 text-[8px] font-mono text-white/80 bg-black/30 px-1.5 py-0.5 rounded-xs">{preset.label}</div>
            </div>
          )}

          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-900/60">
            <button
              onClick={() => onToggleLike(post.id)}
              className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer ${post.likedByMe ? "text-rose-400" : "text-slate-500 hover:text-rose-400"}`}
            >
              <Heart className={`w-3.5 h-3.5 ${post.likedByMe ? "fill-current" : ""}`} /> {post.likes}
            </button>
            <button
              onClick={() => (expanded ? null : onToggleComments(post.id))}
              className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors ${expanded ? "text-cyan-400 cursor-default" : `cursor-pointer ${isCommentsOpen ? "text-cyan-400" : "text-slate-500 hover:text-cyan-400"}`}`}
            >
              <MessageCircle className="w-3.5 h-3.5" /> {post.comments.length}
            </button>
            <button onClick={() => onShare(post)} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {showComments && (
            <div className="mt-3 pt-3 border-t border-slate-900/60 space-y-3">
              {post.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <PilotAvatar callsign={c.author} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-300">{c.author}</span>
                      <span className="text-[9px] text-slate-600">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">{c.text}</p>
                    <button
                      onClick={() => onToggleCommentLike(post.id, c.id)}
                      className={`mt-1 flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer ${c.likedByMe ? "text-rose-400" : "text-slate-600 hover:text-rose-400"}`}
                    >
                      <Heart className={`w-2.5 h-2.5 ${c.likedByMe ? "fill-current" : ""}`} /> {c.likes}
                    </button>
                  </div>
                </div>
              ))}
              {post.comments.length === 0 && <p className="text-[10px] text-slate-600 font-sans">No comments yet.</p>}
              <div className="flex items-center gap-2 pt-1">
                <PilotAvatar callsign={myCallsign} size="sm" />
                <input
                  value={commentDraft}
                  onChange={(e) => onDraftChange(post.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmitComment(post.id);
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xs px-2.5 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 font-sans outline-hidden focus:border-cyan-500/40"
                />
                <button
                  onClick={() => onSubmitComment(post.id)}
                  disabled={!commentDraft.trim()}
                  className="scope-btn px-2.5 py-1.5 border border-slate-800 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommLink() {
  const {
    isPilotLoggedIn, pilotCallsign, fuelCells, pilotProgress, beginBiometricLink, pushToast, playSystemSound,
    salvageArtifacts, workshopProjects
  } = usePilot();
  const [innerTab, setInnerTab] = useState("PROFILE");
  // Shipyard sub-views: the board itself, the Workshop editor, or a single
  // salvage artifact's code detail — mirrors Cap Log's list/detail split.
  const [showcaseView, setShowcaseView] = useState("BOARD");
  const [workshopTarget, setWorkshopTarget] = useState(null); // { project } or { seed }
  const [viewingArtifactId, setViewingArtifactId] = useState(null);

  const myCallsign = isPilotLoggedIn && pilotCallsign ? pilotCallsign : "CADET_SOLO_1";

  const fleetPercent = fleetMastery(pilotProgress);

  /* =========================================================
     📡 COMMS FEED — seed transmissions merged with anything a
     pilot has posted/liked/followed locally. Loaded post-mount
     (not in the lazy initializer) to avoid an SSR/client
     hydration mismatch — same pattern PilotContext uses for
     progress/cells.
     ========================================================= */
  const [posts, setPosts] = useState(SEED_POSTS);
  const [following, setFollowing] = useState(() => new Set());
  useEffect(() => {
    try {
      const savedPosts = localStorage.getItem("HUD_COMM_FEED");
      if (savedPosts) setPosts(JSON.parse(savedPosts));
      const savedFollowing = localStorage.getItem("HUD_COMM_FOLLOWING");
      if (savedFollowing) setFollowing(new Set(JSON.parse(savedFollowing)));
    } catch {
      /* a corrupt cache should never blank the feed */
    }
  }, []);

  const updatePosts = useCallback((updater) => {
    setPosts((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem("HUD_COMM_FEED", JSON.stringify(next));
      } catch {
        /* private mode / full storage — feed still works in-memory this session */
      }
      return next;
    });
  }, []);

  const toggleFollow = useCallback(
    (callsign) => {
      setFollowing((prev) => {
        const next = new Set(prev);
        const wasFollowing = next.has(callsign);
        if (wasFollowing) next.delete(callsign);
        else next.add(callsign);
        try {
          localStorage.setItem("HUD_COMM_FOLLOWING", JSON.stringify([...next]));
        } catch {
          /* private mode / full storage — follow state still works in-memory this session */
        }
        playSystemSound("CLICK");
        if (!wasFollowing) {
          pushToast({ title: "Following", body: `You're now following ${callsign}.`, tone: "info", voice: null });
        }
        return next;
      });
    },
    [playSystemSound, pushToast]
  );

  const [feedSort, setFeedSort] = useState("TOP");
  const [feedChannel, setFeedChannel] = useState("ALL");
  const [viewingPost, setViewingPost] = useState(null);
  const [openComments, setOpenComments] = useState(() => new Set());
  const [commentDrafts, setCommentDrafts] = useState({});
  const [composerText, setComposerText] = useState("");
  const [composerChannel, setComposerChannel] = useState("General");
  const [composerImage, setComposerImage] = useState(null);

  const toggleComments = (postId) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const toggleLike = (postId) => {
    updatePosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) } : p))
    );
    playSystemSound("CLICK");
  };

  const toggleCommentLike = (postId, commentId) => {
    updatePosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              comments: p.comments.map((c) =>
                c.id === commentId ? { ...c, likedByMe: !c.likedByMe, likes: c.likes + (c.likedByMe ? -1 : 1) } : c
              )
            }
      )
    );
  };

  const handleShare = () => {
    pushToast({ title: "Link copied", body: "Ready to share.", tone: "info", voice: null });
  };

  const handleDraftChange = (postId, value) => setCommentDrafts((prev) => ({ ...prev, [postId]: value }));

  const submitComment = (postId) => {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    const newComment = { id: `c_${Date.now()}`, author: myCallsign, text, createdAt: Date.now(), likes: 0, likedByMe: false };
    updatePosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p)));
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    playSystemSound("SUCCESS");
  };

  const handleTransmit = () => {
    const text = composerText.trim();
    if (!text) return;
    const newPost = {
      id: `local_${Date.now()}`,
      author: myCallsign,
      channel: composerChannel,
      createdAt: Date.now(),
      title: null,
      body: text,
      image: composerImage,
      likes: 0,
      likedByMe: false,
      comments: []
    };
    updatePosts((prev) => [newPost, ...prev]);
    setComposerText("");
    setComposerImage(null);
    playSystemSound("SUCCESS");
    pushToast({ title: "Posted!", body: "Your post is live.", tone: "reward", voice: null });
  };

  const filteredPosts = useMemo(() => (feedChannel === "ALL" ? posts : posts.filter((p) => p.channel === feedChannel)), [posts, feedChannel]);
  const sortedPosts = useMemo(() => {
    const arr = [...filteredPosts];
    if (feedSort === "TOP") arr.sort((a, b) => b.likes - a.likes);
    else arr.sort((a, b) => b.createdAt - a.createdAt);
    return arr;
  }, [filteredPosts, feedSort]);

  const viewedPost = viewingPost ? posts.find((p) => p.id === viewingPost) : null;
  const authorTransmissionCount = useCallback((callsign) => posts.filter((p) => p.author === callsign).length, [posts]);

  const myPosts = useMemo(() => posts.filter((p) => p.author === myCallsign), [posts, myCallsign]);
  const lastTransmissionLabel = myPosts.length > 0 ? `${timeAgo(Math.max(...myPosts.map((p) => p.createdAt)))} ago` : "Not yet";

  // 🪐 Every sector in the shared catalog now shows up here — the profile
  // used to hardcode 4 languages (2 of them frozen at 0%) while Rust and
  // SQL were entirely missing from the mastery readout.
  const masteries = PLANETARY_SYSTEM.map((sector) => ({
    id: sector.id,
    name: sector.short,
    value: sectorMastery(sector.id, pilotProgress),
    color: sector.tailwind.bar
  }));

  // Holographic inventory collectibles that unencrypt based on completed quest
  // benchmarks. Three tiers now: a Starter badge per language (first lesson),
  // a Certified badge per language (full Core module — see languageCertificateEarned),
  // and a Stack badge per track once every language on it is certified.
  const STARTER_BADGES = [
    { id: "badge_py_01", title: "Python Starter", desc: "Finished your first Python lesson.", sectorId: "Python Engine Core", accent: "border-amber-500 text-amber-400 bg-amber-950/20" },
    { id: "badge_js_01", title: "JavaScript Starter", desc: "Finished your first JavaScript lesson.", sectorId: "JavaScript Engine", accent: "border-orange-500 text-orange-400 bg-orange-950/20" },
    { id: "badge_ts_01", title: "TypeScript Starter", desc: "Finished your first TypeScript lesson.", sectorId: "TypeScript Array", accent: "border-blue-500 text-blue-400 bg-blue-950/20" },
    { id: "badge_go_01", title: "Go Starter", desc: "Finished your first Go lesson.", sectorId: "Go Engine Subsystem", accent: "border-cyan-500 text-cyan-400 bg-cyan-950/20" },
    { id: "badge_rust_01", title: "Rust Starter", desc: "Finished your first Rust lesson.", sectorId: "Rust Core Defense", accent: "border-rose-500 text-rose-400 bg-rose-950/20" },
    { id: "badge_sql_01", title: "SQL Starter", desc: "Finished your first SQL lesson.", sectorId: "SQL Relational Matrix", accent: "border-emerald-500 text-emerald-400 bg-emerald-950/20" }
  ];

  const achievementBadges = useMemo(() => {
    const starterBadges = STARTER_BADGES.map((b) => ({
      ...b,
      tier: "starter",
      earned: () => (pilotProgress[b.sectorId] || 0) >= 1
    }));
    const certifiedBadges = PLANETARY_SYSTEM.map((s) => ({
      id: `badge_${s.short.toLowerCase()}_cert`,
      tier: "language",
      title: `${s.short} Certified`,
      desc: `Cleared the ${s.name} core curriculum.`,
      accent: "border-yellow-400 text-yellow-300 bg-yellow-950/20",
      earned: () => languageCertificateEarned(s.id, pilotProgress)
    }));
    const stackBadges = TRACKS.map((t) => ({
      id: `badge_stack_${t.id}`,
      tier: "stack",
      title: `${t.label.replace(" Track", "")} Stack Certified`,
      desc: `Certified in every language on the ${t.label.replace(" Track", "")} track.`,
      accent: "border-amber-400 text-amber-300 bg-amber-950/25",
      earned: () => trackCertificate(t.id, pilotProgress).earned
    }));
    const fleetBadge = {
      id: "badge_fleet_commander",
      tier: "fleet",
      title: "Fleet Commander",
      desc: "Finished every subject.",
      accent: "border-cyan-300 text-cyan-200 bg-cyan-950/30",
      earned: () => fleetPercent >= 100
    };
    return [...starterBadges, ...certifiedBadges, ...stackBadges, fleetBadge];
  }, [pilotProgress, fleetPercent]);

  const isBadgeUnlocked = (badge) => badge.earned();
  const earnedBadgeTotal = achievementBadges.filter(isBadgeUnlocked).length;
  const BADGE_ICONS = { starter: Award, language: Award, stack: ShieldCheck, "stack-project": Trophy, fleet: Trophy };

  // Live leaderboard — the pilot's own row now actually re-sorts against the
  // roster as fuel cells change, instead of sitting frozen at a fixed rank.
  const fullRoster = useMemo(() => {
    const npcRoster = [
      { callsign: "Commander_Py", cells: 12840, node: "ORION_SECTOR" },
      { callsign: "Star_Compiler", cells: 9120, node: "PERIMETER_X" },
      { callsign: "Byte_Nebula", cells: 7450, node: "SOLAR_CORE" },
      { callsign: "Vector_Ghost", cells: 3200, node: "DRIFT_BELT" }
    ];
    const player = { callsign: myCallsign, cells: fuelCells, node: "LOCAL_ORBIT", active: true };
    return [...npcRoster, player]
      .sort((a, b) => b.cells - a.cells)
      .map((entry, idx) => ({ ...entry, rank: String(idx + 1).padStart(2, "0") }));
  }, [fuelCells, myCallsign]);

  // Real Shipyard data (Phase 04): published Workshop builds + auto-logged
  // salvage artifacts, newest first — no more flavor-text placeholder cards.
  const publishedProjects = useMemo(
    () => workshopProjects.filter((p) => p.status === "published").sort((a, b) => new Date(b.publishedAt || b.updatedAt) - new Date(a.publishedAt || a.updatedAt)),
    [workshopProjects]
  );
  const draftProjects = useMemo(
    () => workshopProjects.filter((p) => p.status !== "published").sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [workshopProjects]
  );
  const viewingArtifact = viewingArtifactId ? salvageArtifacts.find((a) => a.id === viewingArtifactId) : null;

  const openGuidedBuild = useCallback(
    (build) => {
      const existing = workshopProjects.find((p) => p.sourceGuidedBuildId === build.id);
      setWorkshopTarget(existing ? { project: existing } : { seed: { title: build.title, files: build.files, sourceGuidedBuildId: build.id } });
      setShowcaseView("WORKSHOP");
      playSystemSound("CLICK");
    },
    [workshopProjects, playSystemSound]
  );

  const openWorkshopProject = useCallback(
    (project) => {
      setWorkshopTarget({ project });
      setShowcaseView("WORKSHOP");
      playSystemSound("CLICK");
    },
    [playSystemSound]
  );

  const openNewProject = useCallback(() => {
    setWorkshopTarget({ seed: null });
    setShowcaseView("WORKSHOP");
    playSystemSound("CLICK");
  }, [playSystemSound]);

  const now = useMemo(() => new Date(), []);
  const endOfMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0), [now]);
  const daysLeft = Math.max(1, Math.ceil((endOfMonth - now) / 86400000));
  const monthlyChallenge = CHALLENGE_ROTATION[now.getMonth() % CHALLENGE_ROTATION.length];

  return (
    <div className="flex flex-col h-full gap-4 bg-transparent animate-fade-in font-mono text-cyan-400">
      {/* HUD MENU HEADER */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
        <div>
          <h1 className="font-scope text-base font-semibold uppercase tracking-[0.15em] mb-0.5 text-cyan-400 text-shadow-cyan flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse" />
            The Comm-Link
          </h1>
          <p className="text-[10px] text-slate-400 font-sans">Connect with pilots across the fleet.</p>
        </div>
      </div>

      {/* HORIZONTAL COCKPIT INNER TABS */}
      <div className="flex flex-wrap gap-1.5 pointer-events-auto">
        {[
          { id: "PROFILE", label: "Pilot Logs", icon: User },
          { id: "LEADERBOARD", label: "Roster Ranks", icon: Trophy },
          { id: "SHOWCASE", label: "Shipyard", icon: Rocket },
          { id: "BLOG", label: "Cap Log", icon: FileText },
          { id: "CHALLENGE", label: "Fleet Ops", icon: Target }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActiveTab = innerTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setInnerTab(tab.id);
                setViewingPost(null);
                setShowcaseView("BOARD");
                setWorkshopTarget(null);
                setViewingArtifactId(null);
              }}
              className={`relative scope-btn scope-frame scope-frame-sm flex items-center gap-2 px-3 py-1.5 font-scope text-[11px] font-semibold uppercase border transition-all duration-300 cursor-pointer ${
                isActiveTab
                  ? "bg-cyan-950/40 border-cyan-400 text-cyan-400 scope-glow"
                  : "border-slate-800/40 text-slate-500 hover:text-slate-300 hover:bg-slate-900/40"
              }`}
            >
              {/* Deep ambient indigo under-glow — the nav-focus tell for
                  whichever sub-tab is active, purely decorative. */}
              {isActiveTab && (
                <span
                  className="pointer-events-none absolute left-1/2 -bottom-2.5 -translate-x-1/2 w-4/5 h-2.5 rounded-full blur-md"
                  style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.75), transparent 75%)" }}
                  aria-hidden="true"
                />
              )}
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-PANEL DISPLAY GLASS VIEWPORTS */}
      <div className="flex-1 overflow-y-auto pr-1 pointer-events-auto">
        {innerTab === "PROFILE" && (
          <div className="space-y-4">
            {/* PILOT PROFILE SHOWCASE HERO */}
            <div className="scope-frame scope-frame-lg p-5 border border-cyan-500/20 bg-slate-950/40 backdrop-blur-xs relative overflow-hidden">
              <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.015]" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <PilotAvatar callsign={myCallsign} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-scope text-lg font-bold uppercase tracking-wide text-slate-100 text-shadow-cyan truncate">{myCallsign}</h2>
                    <span className="cockpit-pill" title="Pilot rank">
                      <span className="font-scope text-[9px] font-bold uppercase tracking-wide text-amber-400">New Pilot</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-1">{bioFor(myCallsign)}</p>
                  {!isPilotLoggedIn && (
                    <button
                      onClick={beginBiometricLink}
                      className="mt-2 text-[10px] text-cyan-400 hover:text-cyan-300 font-scope font-bold uppercase tracking-wide cursor-pointer"
                    >
                      Link Biometric ID →
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-900">
                <div>
                  <div className="font-scope text-lg font-bold text-cyan-400">{myPosts.length}</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Posts</div>
                </div>
                <div>
                  <div className="font-scope text-lg font-bold text-cyan-400">{(followerCount(myCallsign)).toLocaleString()}</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Followers</div>
                </div>
                <div>
                  <div className="font-scope text-lg font-bold text-cyan-400">{fleetPercent}%</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Progress</div>
                </div>
                <div>
                  <div className="font-scope text-lg font-bold text-amber-400">{earnedBadgeTotal}/{achievementBadges.length}</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Badges</div>
                </div>
                <div>
                  <div className="font-scope text-lg font-bold text-emerald-400">{fuelCells.toLocaleString()}</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Fuel Cells</div>
                </div>
              </div>
            </div>

            {/* FLEET MASTERY INDEX — a single-glance rollup across all six sectors */}
            <div className="scope-frame p-4 pt-5 border border-cyan-500/20 bg-slate-950/30 backdrop-blur-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Your Progress</span>
                <span className="font-scope text-sm font-bold text-cyan-400">{fleetPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 border border-slate-800/40 rounded-xs overflow-hidden p-0.5">
                <div className="h-full rounded-xs bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500" style={{ width: `${fleetPercent}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">Finish all 6 subjects to become Fleet Commander.</p>
            </div>

            {/* 📟 PADD PERSONAL LOG ARRAY — the pilot's own data readouts,
                framed as glowing hand-terminal cards with a SEC-LOG //
                TRAC-ID stamp instead of a plain boxed panel. Same data,
                same computed values — card chrome only. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative scope-frame p-4 pt-5 border border-cyan-500/25 bg-slate-950/50 backdrop-blur-xs space-y-3 shadow-[0_0_18px_rgba(34,211,238,0.06)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/70 via-cyan-300/40 to-transparent" />
                <div className="flex items-center justify-between border-b border-cyan-900/50 pb-1.5">
                  <span className="font-scope text-[10px] text-cyan-400 font-semibold uppercase tracking-widest">Pilot Info</span>
                  <span className="font-mono text-[8px] text-cyan-500/60 tracking-wider">SEC-LOG // TRAC-{String(hashSeed(myCallsign || "GUEST") % 9000 + 1000)}</span>
                </div>
                <div className="text-[11px] space-y-2 font-mono">
                  <div className="flex justify-between"><span>LEVEL:</span> <span className="text-amber-500 font-bold">Beginner</span></div>
                  <div className="flex justify-between"><span>LAST POST:</span> <span className="text-cyan-400">{lastTransmissionLabel}</span></div>
                </div>
              </div>

              <div className="relative scope-frame p-4 pt-5 border border-cyan-500/25 bg-slate-950/50 backdrop-blur-xs space-y-3 shadow-[0_0_18px_rgba(34,211,238,0.06)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/70 via-cyan-300/40 to-transparent" />
                <div className="flex items-center justify-between border-b border-cyan-900/50 pb-1.5">
                  <span className="font-scope text-[10px] text-cyan-400 font-semibold uppercase tracking-widest">Your Skills</span>
                  <span className="font-mono text-[8px] text-cyan-500/60 tracking-wider">SEC-LOG // TRAC-{String(hashSeed(`${myCallsign || "GUEST"}_skills`) % 9000 + 1000)}</span>
                </div>
                <div className="space-y-2.5 pt-0.5">
                  {masteries.map((m, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400 uppercase">{m.name}</span>
                        <span className="text-slate-200">{m.value}%</span>
                      </div>
                      <div className="w-full bg-slate-900 border border-slate-800/40 h-2 rounded-xs overflow-hidden p-0.5">
                        <div className={`h-full rounded-xs transition-all duration-500 ${m.color}`} style={{ width: `${m.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BADGES GRID BOX ARRAY */}
            <div className="scope-frame scope-frame-lg p-4 pt-6 border border-slate-800/60 bg-slate-950/20 backdrop-blur-xs space-y-3">
              <div className="font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest border-b border-slate-900 pb-1">Badges</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {achievementBadges.map((badge, idx) => {
                  const isUnlocked = isBadgeUnlocked(badge);
                  const BadgeIcon = BADGE_ICONS[badge.tier] || Award;
                  return (
                    <div key={idx} className={`p-3 rounded border flex items-start gap-3 transition-all duration-300 relative overflow-hidden group ${isUnlocked ? `${badge.accent} shadow-[0_0_15px_rgba(6,182,212,0.03)] hover:scale-[1.01]` : "border-slate-950 bg-slate-950/70 text-slate-600 opacity-40 shadow-none"}`}>
                      <div className={`p-2 border rounded shrink-0 ${isUnlocked ? "border-current bg-slate-950/50" : "border-slate-900 bg-slate-950"}`}>
                        <BadgeIcon className={`w-5 h-5 ${isUnlocked ? "animate-pulse" : "text-slate-700"}`} />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className={`font-scope text-sm font-semibold uppercase tracking-wide truncate ${isUnlocked ? "text-slate-100" : "text-slate-600"}`}>{badge.title}</h4>
                        <p className="text-[10px] font-sans text-slate-400 leading-tight pr-1">{isUnlocked ? badge.desc : "Locked — keep learning to unlock it."}</p>
                      </div>
                      {!isUnlocked && <div className="absolute top-2 right-2 p-0.5 rounded bg-slate-900/60 text-slate-700"><LockIcon className="w-3 h-3 text-slate-800" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
           {/* SECTOR LEADERBOARD ROSTER */}
        {innerTab === "LEADERBOARD" && (
          <div className="scope-frame border border-slate-800/50 bg-slate-950/20 backdrop-blur-md overflow-hidden shadow-lg animate-fade-in">
            <div className="px-4 py-2 bg-slate-900/30 flex justify-between text-[9px] text-slate-500 font-black tracking-widest border-b border-slate-900">
              <span>RANK</span>
              <span>POINTS</span>
            </div>
            <div className="divide-y divide-slate-900/70 font-mono text-[11px]">
              {fullRoster.map((pilot, idx) => {
                // Top-3 wing badge treatment — gold / silver / bronze, purely
                // decorative on top of the same rank/cells data below.
                const WING_STYLE = [
                  { border: "border-amber-400/50", glow: "shadow-[0_0_16px_rgba(251,191,36,0.12)]", chip: "border-amber-400/60 bg-amber-950/30 text-amber-300", vector: "text-amber-400" },
                  { border: "border-slate-300/40", glow: "shadow-[0_0_14px_rgba(203,213,225,0.1)]", chip: "border-slate-300/50 bg-slate-800/40 text-slate-200", vector: "text-slate-300" },
                  { border: "border-orange-400/35", glow: "shadow-[0_0_12px_rgba(251,146,60,0.1)]", chip: "border-orange-400/50 bg-orange-950/25 text-orange-300", vector: "text-orange-400" }
                ][idx] || null;
                return (
                  <div
                    key={idx}
                    className={`relative px-4 py-3 flex justify-between items-center transition-all ${
                      WING_STYLE
                        ? `bg-slate-950/40 border-l-2 ${WING_STYLE.border} ${WING_STYLE.glow}`
                        : pilot.active
                        ? "bg-cyan-950/20 border-y border-cyan-500/20 text-cyan-400 shadow-[inset_0_0_12px_rgba(6,182,212,0.05)]"
                        : "text-slate-300 hover:bg-slate-900/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {WING_STYLE ? (
                        <span className={`flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 border rounded-xs shrink-0 ${WING_STYLE.chip}`}>
                          <Award className={`w-3 h-3 ${WING_STYLE.vector}`} /> {pilot.rank}
                        </span>
                      ) : (
                        <span className={`text-[9px] font-black px-1 border rounded-xs shrink-0 ${pilot.active ? "border-cyan-500/40 bg-cyan-950 text-cyan-400" : "border-slate-800 text-slate-500"}`}>{pilot.rank}</span>
                      )}
                      <PilotAvatar callsign={pilot.callsign} size="sm" />
                      <span className={`font-bold uppercase truncate ${WING_STYLE ? WING_STYLE.vector : ""}`}>{pilot.callsign}</span>
                    </div>
                    <span className={`font-mono font-bold shrink-0 ${WING_STYLE ? WING_STYLE.vector : pilot.active ? "text-cyan-400" : "text-amber-400"}`}>{pilot.cells.toLocaleString()} pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SHIPYARD — Workshop editor sub-view */}
        {innerTab === "SHOWCASE" && showcaseView === "WORKSHOP" && (
          <Workshop
            project={workshopTarget?.project || null}
            seed={workshopTarget?.seed || null}
            onBack={() => {
              setShowcaseView("BOARD");
              setWorkshopTarget(null);
            }}
          />
        )}

        {/* SHIPYARD — salvage artifact detail sub-view */}
        {innerTab === "SHOWCASE" && showcaseView === "ARTIFACT" && viewingArtifact && (
          <div className="space-y-3 animate-fade-in">
            <button
              onClick={() => {
                setShowcaseView("BOARD");
                setViewingArtifactId(null);
              }}
              className="flex items-center gap-1 font-scope text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-cyan-400 transition-colors duration-200 cursor-pointer w-fit"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Shipyard
            </button>
            <div className="scope-frame scope-frame-lg p-4 border border-slate-800/60 bg-slate-950/40 space-y-3">
              <div>
                <h3 className="font-scope text-sm font-semibold text-slate-100 uppercase tracking-wide">{viewingArtifact.lessonTitle}</h3>
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[8px] rounded-xs text-cyan-400 font-black uppercase">{viewingArtifact.sectorName}</span>
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[8px] rounded-xs text-slate-500 font-bold uppercase tracking-wider">{viewingArtifact.concept}</span>
                  <span className="text-[9px] text-slate-600">{timeAgo(viewingArtifact.clearedAt)}</span>
                </div>
              </div>
              <pre className="scope-frame scope-frame-sm p-3 bg-slate-950/80 border border-slate-900 text-[11px] font-mono text-emerald-300/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{viewingArtifact.code || "// (no buffer captured)"}
              </pre>
            </div>
          </div>
        )}

        {/* SHIPYARD BOARD — real salvage + published Workshop projects, plus
            the Guided Build catalog and Stack Certifications. No more
            flavor-text placeholder cards: everything here is either the
            pilot's own submitted code or something they built themselves. */}
        {innerTab === "SHOWCASE" && showcaseView === "BOARD" && (
          <div className="space-y-5 animate-fade-in">
            {/* STACK CERTIFICATIONS */}
            <div className="flex flex-wrap gap-2">
              {TRACKS.map((track) => {
                const cert = trackCertificate(track.id, pilotProgress);
                return (
                  <div
                    key={track.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded border text-[10px] font-scope font-bold uppercase tracking-wide ${
                      cert.earned
                        ? "border-amber-400/60 bg-amber-950/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                        : "border-slate-900 bg-slate-950/40 text-slate-600"
                    }`}
                    title={track.description}
                  >
                    {cert.earned ? <ShieldCheck className="w-3.5 h-3.5" /> : <LockIcon className="w-3 h-3" />}
                    {track.label.replace(" Track", "")} Stack
                  </div>
                );
              })}
            </div>

            {/* GUIDED BUILDS — unlock per-language once that Certificate is earned */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest flex items-center gap-1.5">
                  <Wrench className="w-3 h-3" /> Guided Builds
                </h3>
                <button
                  onClick={openNewProject}
                  className="scope-btn scope-frame scope-frame-sm flex items-center gap-1.5 px-2.5 py-1 font-scope text-[10px] font-bold uppercase tracking-wide border border-cyan-500/40 bg-cyan-950/25 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3" /> New Project
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {GUIDED_BUILDS.map((build) => {
                  const unlocked = isGuidedBuildUnlocked(build, pilotProgress);
                  // Non-Negotiables Pass: a locked build stays keyboard-
                  // reachable and announced (aria-disabled + label) rather
                  // than vanishing from the tab order the way a real
                  // `disabled` button would.
                  return (
                    <button
                      key={build.id}
                      onClick={() => {
                        if (unlocked) {
                          openGuidedBuild(build);
                          return;
                        }
                        playSystemSound("ERROR");
                        pushToast({ title: "Guided build locked", body: `Requires the ${build.short} Certificate first.`, tone: "info", voice: null });
                      }}
                      aria-disabled={!unlocked || undefined}
                      aria-label={!unlocked ? `${build.title}, locked, needs ${build.short} certificate` : undefined}
                      className={`text-left scope-frame p-3 border transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                        unlocked
                          ? "border-slate-800/60 bg-slate-950/30 hover:border-cyan-500/30 hover:scope-glow cursor-pointer"
                          : "border-slate-900 bg-slate-950/10 opacity-60 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {unlocked ? <Wrench className="w-3 h-3 text-cyan-400" /> : <LockIcon className="w-3 h-3 text-slate-600" />}
                        <span className="font-scope text-[11px] font-bold uppercase tracking-wide text-slate-200 truncate">{build.title}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-sans leading-relaxed">{build.brief}</p>
                      <span className={`mt-2 inline-block px-2 py-0.5 text-[8px] rounded-xs font-black uppercase ${unlocked ? "bg-slate-900 border border-slate-800 text-amber-400" : "bg-slate-900/60 border border-slate-800 text-slate-600"}`}>
                        {unlocked ? build.short : `Needs ${build.short} Certificate`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DRAFTS — quiet resume row, only shown when a draft exists */}
            {draftProjects.length > 0 && (
              <div>
                <h3 className="font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Your Drafts</h3>
                <div className="flex flex-wrap gap-2">
                  {draftProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openWorkshopProject(p)}
                      className="scope-btn flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-800 bg-slate-900/40 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-all cursor-pointer font-scope text-[10px] font-bold uppercase tracking-wide"
                    >
                      <FileText className="w-3 h-3" /> {p.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PUBLISHED PROJECTS + SALVAGE ARTIFACTS */}
            <div>
              <h3 className="font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Package className="w-3 h-3" /> Shipyard Board
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publishedProjects.map((p) => {
                  const stats = showcaseStats(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => openWorkshopProject(p)}
                      className="blueprint-frame blueprint-tilt text-left scope-frame p-4 pt-5 border border-dashed border-cyan-500/30 group hover:border-cyan-400/60 transition-colors duration-300 cursor-pointer"
                    >
                      <h4 className="relative font-scope text-sm font-semibold text-slate-200 mt-0.5 mb-2 uppercase tracking-wide group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> {p.title}
                      </h4>
                      <p className="relative text-[11px] text-slate-400 leading-relaxed font-sans">{p.files.length} file{p.files.length === 1 ? "" : "s"} · Workshop build</p>
                      <div className="relative mt-3 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-900/80 border border-emerald-500/30 text-[8px] rounded-xs text-emerald-400 font-black uppercase">Published</span>
                        <span className="ml-auto flex items-center gap-2.5 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {stats.likes}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {stats.comments}</span>
                        </span>
                      </div>
                      <span className="relative mt-3 inline-flex items-center gap-1.5 px-3 py-1 border border-cyan-400/60 bg-cyan-950/30 text-cyan-300 font-scope text-[9px] font-bold uppercase tracking-widest rounded-xs group-hover:bg-cyan-400 group-hover:text-black transition-all">
                        Open Blueprint
                      </span>
                    </button>
                  );
                })}

                {salvageArtifacts.map((a) => {
                  const stats = showcaseStats(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setViewingArtifactId(a.id);
                        setShowcaseView("ARTIFACT");
                      }}
                      className="blueprint-frame blueprint-tilt text-left scope-frame p-4 pt-5 border border-dashed border-cyan-500/30 group hover:border-cyan-400/60 transition-colors duration-300 cursor-pointer"
                    >
                      <h4 className="relative font-scope text-sm font-semibold text-slate-200 mt-0.5 mb-2 uppercase tracking-wide group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {a.lessonTitle}
                      </h4>
                      <p className="relative text-[11px] text-slate-400 leading-relaxed font-sans">Salvaged from {a.sectorName} — {a.concept}.</p>
                      <div className="relative mt-3 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-900/80 border border-slate-700 text-[8px] rounded-xs text-slate-400 font-bold uppercase tracking-wider">Salvage</span>
                        <span className="ml-auto flex items-center gap-2.5 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {stats.likes}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {stats.comments}</span>
                        </span>
                      </div>
                      <span className="relative mt-3 inline-flex items-center gap-1.5 px-3 py-1 border border-cyan-400/60 bg-cyan-950/30 text-cyan-300 font-scope text-[9px] font-bold uppercase tracking-widest rounded-xs group-hover:bg-cyan-400 group-hover:text-black transition-all">
                        Open Blueprint
                      </span>
                    </button>
                  );
                })}

                {publishedProjects.length === 0 && salvageArtifacts.length === 0 && (
                  <div className="md:col-span-2 scope-frame p-4 pt-5 border border-dashed border-slate-800 bg-slate-950/20 flex items-center justify-center text-center text-[11px] text-slate-600 font-sans">
                    Clear an exercise in Flight Academy or publish a Workshop build to see it here.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CAP LOG — fleet-wide community feed, structured like a real
            community page (channel rail // feed // widgets) instead of a
            single flat list: browse by channel, post text or an attached
            flight-log capture, like/comment/share, and open any
            transmission into its own thread with the author's pilot
            dossier alongside it. Frontend-only: everything here lives in
            HUD_COMM_FEED / HUD_COMM_FOLLOWING (localStorage), seeded with
            other pilots' posts so the feed never opens empty. */}
        {innerTab === "BLOG" && !viewedPost && (
          <div className="grid grid-cols-1 lg:grid-cols-[176px_1fr_240px] gap-4 items-start animate-fade-in">
            {/* LEFT — CHANNEL RAIL (desktop) */}
            <div className="hidden lg:flex flex-col gap-1 scope-frame p-3 border border-slate-800/60 bg-slate-950/30 backdrop-blur-xs">
              <div className="font-scope text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 px-1">Channels</div>
              <button
                onClick={() => setFeedChannel("ALL")}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xs text-[10px] font-scope font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                  feedChannel === "ALL" ? "bg-cyan-950/50 text-cyan-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/40"
                }`}
              >
                <Flame className="w-3 h-3" /> All
              </button>
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFeedChannel(c)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-xs text-[10px] font-scope font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                    feedChannel === c ? "bg-cyan-950/50 text-cyan-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/40"
                  }`}
                >
                  <Hash className="w-3 h-3" /> {c}
                </button>
              ))}
            </div>

            {/* CENTER — COMPOSER + FEED */}
            <div className="space-y-4 min-w-0">
              {/* MOBILE CHANNEL STRIP */}
              <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-0.5">
                <button
                  onClick={() => setFeedChannel("ALL")}
                  className={`shrink-0 px-2 py-1 font-scope text-[9px] font-bold uppercase tracking-wide border rounded-xs transition-all cursor-pointer ${
                    feedChannel === "ALL" ? "bg-cyan-950/50 border-cyan-500 text-cyan-400" : "border-slate-800 text-slate-500"
                  }`}
                >
                  All
                </button>
                {CHANNELS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFeedChannel(c)}
                    className={`shrink-0 px-2 py-1 font-scope text-[9px] font-bold uppercase tracking-wide border rounded-xs transition-all cursor-pointer ${
                      feedChannel === c ? "bg-cyan-950/50 border-cyan-500 text-cyan-400" : "border-slate-800 text-slate-500"
                    }`}
                  >
                    #{c}
                  </button>
                ))}
              </div>

              {/* 🖥️ ENGINE STATUS TICKER — retro green terminal readout,
                  scrolling downward on a loop. Purely decorative flavor
                  text (ENGINE_STATUS_LOG, a static array above); it never
                  reads or writes any real pilot/build state. */}
              <div className="scope-frame relative h-16 overflow-hidden border border-emerald-900/50 bg-black/60 font-mono">
                <div className="absolute top-0 left-0 right-0 px-2 py-1 bg-emerald-950/40 border-b border-emerald-900/60 text-[8px] text-emerald-400 font-black uppercase tracking-widest z-10">
                  Engine Status // Release Feed
                </div>
                <div className="absolute inset-0 top-5 animate-terminal-feed">
                  {[...ENGINE_STATUS_LOG, ...ENGINE_STATUS_LOG].map((line, idx) => (
                    <div key={idx} className="px-2 py-0.5 text-[10px] text-emerald-400/90 whitespace-nowrap">
                      {line}
                    </div>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
              </div>

              {/* COMPOSER */}
              <div className="scope-frame p-4 border border-slate-800/60 bg-slate-950/30 backdrop-blur-xs space-y-3">
                <div className="flex items-start gap-3">
                  <PilotAvatar callsign={myCallsign} />
                  <textarea
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    placeholder="Share an update..."
                    rows={2}
                    className="flex-1 bg-slate-950/60 border border-slate-800 rounded-sm px-3 py-2 text-[12px] text-slate-200 placeholder-slate-600 font-sans outline-hidden focus:border-cyan-500/40 resize-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <span className="text-[9px] text-slate-600 font-scope font-bold uppercase shrink-0">Attach:</span>
                  {IMAGE_PRESETS.map((ip) => (
                    <button
                      key={ip.id}
                      onClick={() => setComposerImage((prev) => (prev === ip.id ? null : ip.id))}
                      title={ip.label}
                      className={`shrink-0 w-7 h-7 rounded-xs border-2 transition-all cursor-pointer ${composerImage === ip.id ? "border-cyan-400 scale-110" : "border-slate-800 hover:border-slate-600"}`}
                      style={{ background: `linear-gradient(135deg, ${ip.from}, ${ip.to})` }}
                    />
                  ))}
                  {composerImage && (
                    <button onClick={() => setComposerImage(null)} className="shrink-0 text-[9px] text-slate-500 hover:text-slate-300 font-scope font-bold uppercase cursor-pointer">
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full">
                    {CHANNELS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setComposerChannel(c)}
                        className={`shrink-0 px-2 py-1 font-scope text-[9px] font-bold uppercase tracking-wide border rounded-xs transition-all cursor-pointer ${
                          composerChannel === c ? "bg-cyan-950/50 border-cyan-500 text-cyan-400" : "border-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        #{c}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleTransmit}
                    disabled={!composerText.trim()}
                    className="scope-btn shrink-0 flex items-center gap-1.5 px-3 py-1.5 font-scope text-[11px] font-bold uppercase tracking-widest border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-400 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-cyan-950/30 disabled:hover:text-cyan-400 transition-all cursor-pointer"
                  >
                    <Send className="w-3 h-3" /> Post
                  </button>
                </div>
              </div>

              {/* FEED SORT TABS */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {[{ id: "TOP", label: "Top" }, { id: "NEW", label: "Newest" }].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setFeedSort(s.id)}
                      className={`px-2.5 py-1 font-scope text-[10px] font-bold uppercase tracking-wide border-b-2 transition-colors cursor-pointer ${
                        feedSort === s.id ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {feedChannel !== "ALL" && (
                  <button onClick={() => setFeedChannel("ALL")} className="flex items-center gap-1 text-[10px] text-cyan-400 font-scope font-bold uppercase tracking-wide cursor-pointer">
                    #{feedChannel} ✕
                  </button>
                )}
              </div>

              {/* FEED */}
              <div className="space-y-3">
                {sortedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isCommentsOpen={openComments.has(post.id)}
                    commentDraft={commentDrafts[post.id] || ""}
                    myCallsign={myCallsign}
                    onOpenDetail={setViewingPost}
                    onToggleLike={toggleLike}
                    onToggleComments={toggleComments}
                    onShare={handleShare}
                    onDraftChange={handleDraftChange}
                    onSubmitComment={submitComment}
                    onToggleCommentLike={toggleCommentLike}
                  />
                ))}
                {sortedPosts.length === 0 && (
                  <div className="scope-frame p-4 pt-5 border border-dashed border-slate-800 bg-slate-950/20 flex items-center justify-center text-center text-[11px] text-slate-600 font-sans">
                    No posts in #{feedChannel} yet.
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — WIDGETS (desktop) */}
            <div className="hidden lg:flex flex-col gap-3">
              <div className="scope-frame scope-frame-sm border border-slate-800/60 bg-slate-950/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-scope text-[9px] text-slate-500 font-black uppercase tracking-widest">Top Pilots</span>
                  <button onClick={() => setInnerTab("LEADERBOARD")} className="text-[9px] text-cyan-400 hover:text-cyan-300 font-scope font-bold uppercase cursor-pointer">See all</button>
                </div>
                <div className="space-y-2">
                  {fullRoster.slice(0, 3).map((pilot, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[8px] font-black text-slate-600 w-3 shrink-0">{idx + 1}</span>
                      <PilotAvatar callsign={pilot.callsign} size="sm" />
                      <span className="text-[10px] font-bold text-slate-300 truncate flex-1">{pilot.callsign}</span>
                      <span className="text-[9px] text-amber-400 font-bold shrink-0">{pilot.cells.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="scope-frame scope-frame-sm border border-slate-800/60 bg-slate-950/30 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-scope text-[9px] text-slate-500 font-black uppercase tracking-widest">Challenge</span>
                  <button onClick={() => setInnerTab("CHALLENGE")} className="text-[9px] text-cyan-400 hover:text-cyan-300 font-scope font-bold uppercase cursor-pointer">Open</button>
                </div>
                <div className="text-[11px] font-bold text-slate-200">{monthlyChallenge.title}</div>
                <p className="text-[9px] text-slate-500 font-sans leading-relaxed mt-1">{monthlyChallenge.brief}</p>
                <div className="text-[9px] text-amber-400 font-bold mt-2">{daysLeft} day{daysLeft === 1 ? "" : "s"} left</div>
              </div>

              <div className="scope-frame scope-frame-sm border border-slate-800/60 bg-slate-950/30 p-3 flex items-start gap-2.5">
                <div className="p-1.5 border border-slate-800 rounded bg-slate-950/60 text-amber-400 shrink-0"><ShieldCheck className="w-4 h-4" /></div>
                <div>
                  <div className="font-scope text-[10px] font-bold uppercase tracking-wide text-slate-300">Community Rules</div>
                  <div className="text-[9px] text-slate-500 font-sans mt-0.5">Be kind. No spam.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CAP LOG — POST DETAIL THREAD */}
        {innerTab === "BLOG" && viewedPost && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start animate-fade-in">
            <div className="space-y-3 min-w-0">
              <button
                onClick={() => setViewingPost(null)}
                className="flex items-center gap-1 font-scope text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-cyan-400 transition-colors duration-200 cursor-pointer w-fit"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>

              <PostCard
                post={viewedPost}
                expanded
                isCommentsOpen
                commentDraft={commentDrafts[viewedPost.id] || ""}
                myCallsign={myCallsign}
                onOpenDetail={() => {}}
                onToggleLike={toggleLike}
                onToggleComments={() => {}}
                onShare={handleShare}
                onDraftChange={handleDraftChange}
                onSubmitComment={submitComment}
                onToggleCommentLike={toggleCommentLike}
              />
            </div>

            {/* PILOT DOSSIER — the author's mini profile card, LinkedIn-style */}
            <div className="flex flex-col gap-3">
              <div className="scope-frame scope-frame-sm border border-slate-800/60 bg-slate-950/40 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <PilotAvatar callsign={viewedPost.author} size="lg" />
                  <div className="min-w-0">
                    <div className="font-scope text-[13px] font-bold text-slate-100 truncate">{viewedPost.author}</div>
                    <div className="text-[10px] text-slate-600">@{viewedPost.author.toLowerCase()}</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">{bioFor(viewedPost.author)}</p>
                <div className="flex items-center justify-between text-center border-t border-b border-slate-900 py-2">
                  <div>
                    <div className="font-scope text-[12px] font-bold text-cyan-400">{authorTransmissionCount(viewedPost.author)}</div>
                    <div className="text-[7px] text-slate-500 uppercase tracking-widest font-black">Posts</div>
                  </div>
                  <div>
                    <div className="font-scope text-[12px] font-bold text-cyan-400">{(followerCount(viewedPost.author) + (following.has(viewedPost.author) ? 1 : 0)).toLocaleString()}</div>
                    <div className="text-[7px] text-slate-500 uppercase tracking-widest font-black">Followers</div>
                  </div>
                  <div>
                    <div className="font-scope text-[12px] font-bold text-cyan-400">{followingCount(viewedPost.author)}</div>
                    <div className="text-[7px] text-slate-500 uppercase tracking-widest font-black">Following</div>
                  </div>
                </div>
                {viewedPost.author === myCallsign ? (
                  <div className="text-center text-[10px] text-slate-500 font-scope font-bold uppercase tracking-wide py-1.5">This is you</div>
                ) : (
                  <button
                    onClick={() => toggleFollow(viewedPost.author)}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 font-scope text-[11px] font-bold uppercase tracking-widest border rounded-xs transition-all cursor-pointer ${
                      following.has(viewedPost.author)
                        ? "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-rose-500/50 hover:text-rose-400"
                        : "border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-400 hover:text-black"
                    }`}
                  >
                    {following.has(viewedPost.author) ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" /> Follow
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FLEET OPS — monthly fleet-wide cycle challenge, distinct from the
            personal daily Relay Log streak over in Space Missions. Restyled
            as a tactical coordination map: the same monthlyChallenge /
            daysLeft / CHALLENGE_STANDINGS data, framed as a squad strike on
            a boss carrier. totalDamage/bossHealthPercent below are pure
            display derivations of CHALLENGE_STANDINGS' existing vote
            numbers — no new state, nothing written back anywhere. */}
        {innerTab === "CHALLENGE" && (() => {
          const totalDamage = CHALLENGE_STANDINGS.reduce((sum, s) => sum + s.votes, 0);
          const BOSS_MAX_HEALTH = 1000;
          const bossHealthPercent = Math.max(4, 100 - Math.min(100, Math.round((totalDamage / BOSS_MAX_HEALTH) * 100)));
          return (
          <div className="space-y-4 animate-fade-in">
            <div className="blueprint-frame scope-frame scope-frame-lg p-5 border border-rose-500/25 space-y-4 overflow-hidden">
              <div className="relative flex items-center gap-3">
                <div className="p-2.5 border border-rose-500/40 rounded bg-rose-950/30 text-rose-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-scope text-sm font-semibold text-slate-100 uppercase tracking-wide">Squad Strike // {monthlyChallenge.title}</h3>
                  <p className="text-[11px] text-slate-400 font-sans">Boss carrier inbound — every pilot's entry chips its shields.</p>
                </div>
              </div>

              <p className="relative text-[11px] text-slate-400 leading-relaxed font-sans">{monthlyChallenge.brief}</p>

              {/* GLOBAL HEALTH POOL — boss carrier shields, tracked across the
                  whole fleet's submitted entries. */}
              <div className="relative space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-slate-400 uppercase">
                  <span className="flex items-center gap-1.5 text-rose-400"><ShieldCheck className="w-3 h-3" /> Carrier Shield Integrity</span>
                  <span className="tabular-nums text-rose-300">{bossHealthPercent}%</span>
                </div>
                <div className="w-full h-3 bg-slate-950 border border-rose-900/60 rounded-xs overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-xs bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 transition-all duration-700 animate-strike-bar"
                    style={{ width: `${bossHealthPercent}%` }}
                  />
                </div>
                <div className="text-[9px] text-slate-500 font-mono">{totalDamage.toLocaleString()} dmg logged fleet-wide this cycle</div>
              </div>

              <div className="relative flex flex-wrap gap-5 pt-1">
                <div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Strike Window</div>
                  <div className="text-xs text-amber-400 font-bold font-mono">{daysLeft} day{daysLeft === 1 ? "" : "s"}</div>
                </div>
                <div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Reward</div>
                  <div className="text-xs text-cyan-400 font-bold font-mono">400 CELLS + Badge</div>
                </div>
                <div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Subject</div>
                  <div className="text-xs text-slate-200 font-bold font-mono">{monthlyChallenge.sector}</div>
                </div>
              </div>

              <button className="relative scope-btn scope-frame scope-frame-sm px-4 py-1.5 font-scope text-[11px] font-semibold uppercase tracking-widest border border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-400 hover:text-black transition-all cursor-pointer">
                Deploy Entry
              </button>
            </div>

            <div className="scope-frame border border-slate-800/60 bg-slate-950/30 backdrop-blur-xs overflow-hidden">
              <div className="px-4 py-2 bg-slate-900/40 text-[9px] text-slate-500 font-black tracking-widest border-b border-slate-900 flex items-center gap-1.5">
                <Radio className="w-3 h-3" /> Squad Assault Log
              </div>
              <div className="divide-y divide-slate-900 font-mono text-[11px]">
                {CHALLENGE_STANDINGS.map((s, idx) => (
                  <div key={idx} className="px-4 py-2.5 flex justify-between items-center text-slate-300">
                    <span className="font-bold uppercase w-1/3 truncate">{s.callsign}</span>
                    <span className="text-slate-500 w-1/3 truncate text-center hidden sm:block">{s.entry}</span>
                    <span className="text-rose-400 font-bold w-1/3 text-right">{s.votes} dmg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
