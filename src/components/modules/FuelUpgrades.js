"use client";
import React, { useState } from "react";
import { Zap, Shield, CheckCircle, Award, Lock, ChevronDown, Radio, TrendingDown } from "lucide-react";

const TIERS = [
  {
    id: "standard",
    name: "Standard Pilot Core",
    monthly: 0,
    annual: 0,
    desc: "Baseline educational telemetry tracking for standard sector cadet training blocks.",
    features: [
      "Access to basic language blueprints",
      "Public sector anomalies and bounties",
      "Standard pilot terminal display profiles"
    ],
    premium: false
  },
  {
    id: "elite",
    name: "Elite Fleet License",
    monthly: 499,
    annual: 4790,
    desc: "Complete clearance overrides for professional grade application engineering matrices.",
    features: [
      "Unrestricted access to all engine blueprints",
      "Priority deployment slots on flight simulations",
      "Custom Combat Array callsign banner",
      "Custom holographic cockpit hulls"
    ],
    premium: true
  },
  {
    id: "command",
    name: "Fleet Command License",
    monthly: 1499,
    annual: 14390,
    desc: "Full command-deck clearance for pilots building toward mission-lead certification.",
    features: [
      "Everything in Elite Fleet License",
      "1:1 flight mentor debrief sessions",
      "Custom sector sandbox creation tools",
      "Priority Comm-Link support channel"
    ],
    topTier: true
  }
];

// Feature-by-feature matrix — a Fuel Upgrades-native equivalent of a
// pricing comparison table, using each tier's own feature language above.
const COMPARISON_ROWS = [
  { label: "Public sector anomalies & bounties", standard: true, elite: true, command: true },
  { label: "Basic language blueprints", standard: true, elite: true, command: true },
  { label: "Unrestricted engine blueprints (all sectors)", standard: false, elite: true, command: true },
  { label: "Priority flight simulation slots", standard: false, elite: true, command: true },
  { label: "Combat Array access (all pilots)", standard: true, elite: true, command: true },
  { label: "Custom Combat Array callsign banner", standard: false, elite: true, command: true },
  { label: "Custom holographic cockpit hulls", standard: false, elite: true, command: true },
  { label: "1:1 flight mentor debrief sessions", standard: false, elite: false, command: true },
  { label: "Custom sector sandbox creation", standard: false, elite: false, command: true },
  { label: "Priority Comm-Link support channel", standard: false, elite: false, command: true }
];

const FAQS = [
  {
    q: "Can I switch between Orbital and Cryo-Cycle billing anytime?",
    a: "Yes — toggle the cycle selector above. Your next billing cycle recalculates automatically at the new rate; nothing about your saved progress changes."
  },
  {
    q: "What happens to my flight data if I downgrade my license?",
    a: "Your pilot progress, badges and fuel cells all stay intact. Downgrading only revokes premium-tier permissions, not your stored training history."
  },
  {
    q: "Is the Standard Pilot Core tier ever discontinued?",
    a: "No — every cadet keeps free baseline clearance to the core academy sectors for as long as their pilot profile exists."
  },
  {
    q: "Do Fleet Command perks apply retroactively?",
    a: "Command Deck perks activate the moment your license clears. Mentor debriefs and sandbox tools unlock immediately — no waiting for the next cycle."
  }
];

const TRANSMISSIONS = [
  { callsign: "Commander_Py", tier: "Elite Fleet License", quote: "Priority sim slots paid for the upgrade the first week — no more queueing behind the whole squadron." },
  { callsign: "Star_Compiler", tier: "Fleet Command License", quote: "The custom sandbox tools alone are worth the Command Deck clearance for prototyping new drills." },
  { callsign: "Byte_Nebula", tier: "Standard Pilot Core", quote: "Cleared three sectors on the free tier before upgrading. No pressure, just runway to learn." }
];

export default function FuelUpgrades() {
  const [billingCycle, setBillingCycle] = useState("orbital"); // "orbital" = monthly, "cryo" = annual
  const [openFaq, setOpenFaq] = useState(null);

  const priceFor = (tier) => {
    if (tier.monthly === 0) return { display: "Free Access", note: null };
    if (billingCycle === "orbital") {
      return { display: `₹${tier.monthly.toLocaleString("en-IN")} / cycle`, note: null };
    }
    const perCycle = Math.round(tier.annual / 12);
    return {
      display: `₹${perCycle.toLocaleString("en-IN")} / cycle`,
      note: `₹${tier.annual.toLocaleString("en-IN")} billed per cryo-cycle · Save ~20%`
    };
  };

  return (
    <div className="flex flex-col h-full gap-5 bg-transparent animate-fade-in overflow-y-auto pr-1">
      {/* HUD MENU HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-scope text-base font-semibold uppercase tracking-[0.15em] mb-1 flex items-center gap-2 text-cyan-400 text-shadow-cyan">
            <Zap className="w-4 h-4 text-cyan-400" />
            Fuel Reserves & Upgrades // License Center
          </h1>
          <p className="text-[11px] text-slate-400 font-mono">Cosmetic clearance tiers only — every sector, mode and the Combat Array unlock through training, never a purchase.</p>
        </div>

        {/* BILLING CYCLE TOGGLE */}
        <div className="scope-frame scope-frame-sm flex items-center border border-slate-800 bg-slate-950/50 p-1 pointer-events-auto shrink-0">
          <button
            onClick={() => setBillingCycle("orbital")}
            className={`px-3 py-1.5 font-scope text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer ${
              billingCycle === "orbital" ? "bg-cyan-950/60 text-cyan-400 scope-glow" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Orbital (Monthly)
          </button>
          <button
            onClick={() => setBillingCycle("cryo")}
            className={`px-3 py-1.5 font-scope text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1 ${
              billingCycle === "cryo" ? "bg-cyan-950/60 text-cyan-400 scope-glow" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Cryo-Cycle (Annual) <TrendingDown className="w-3 h-3 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* TIERS DECK WRAPPER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pointer-events-auto shrink-0">
        {TIERS.map((tier) => {
          const price = priceFor(tier);
          return (
            // Outer wrapper stays unclipped so the overhanging tier badges
            // aren't cut away by the inner panel's clip-path.
            <div key={tier.id} className="relative">
              {tier.premium && (
                <span className="absolute -top-2.5 right-4 z-10 px-2 py-0.5 bg-cyan-600 border border-cyan-500 rounded text-[9px] font-black uppercase text-slate-100 tracking-wider">
                  RECOMMENDED CORE
                </span>
              )}
              {tier.topTier && (
                <span className="absolute -top-2.5 right-4 z-10 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[9px] font-black uppercase text-slate-900 tracking-wider">
                  COMMAND DECK
                </span>
              )}

              <div
                className={`blueprint-frame blueprint-tilt scope-frame p-4 pt-5 border border-dashed bg-slate-950/40 backdrop-blur-xs flex flex-col justify-between transition-colors duration-300 h-full ${
                  tier.premium
                    ? "border-cyan-500/45 scope-glow hover:border-cyan-400/80"
                    : tier.topTier
                    ? "border-slate-400/35 hover:border-slate-300/70"
                    : "border-cyan-800/40 hover:border-cyan-600/50"
                }`}
              >
                <div className="relative space-y-3">
                  <div>
                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-wider">
                      PERMISSIONS TIER 0{TIERS.indexOf(tier) + 1}
                    </div>
                    <h3 className="font-scope text-sm font-semibold text-slate-200 uppercase tracking-wide mt-0.5">{tier.name}</h3>
                  </div>

                  <div className="font-scope text-base font-semibold text-slate-100 tracking-tight bg-slate-900/60 p-2 border border-dashed border-cyan-800/40">
                    <span className={tier.premium ? "text-cyan-400" : tier.topTier ? "text-slate-200" : "text-slate-400"}>{price.display}</span>
                    {price.note && <div className="text-[9px] text-emerald-400 mt-1 font-mono normal-case tracking-normal">{price.note}</div>}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{tier.desc}</p>

                  <div className="border-t border-dashed border-cyan-900/50 my-2"></div>

                  {/* LIST OF TRACKED ITEMS — vector schematic checklist */}
                  <ul className="space-y-1.5 text-[11px] font-mono text-slate-300">
                    {tier.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <CheckCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${tier.premium ? "text-cyan-500" : tier.topTier ? "text-slate-300" : "text-slate-600"}`} />
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative pt-3 border-t border-dashed border-cyan-900/50 mt-4">
                  <button
                    className={`scope-btn scope-frame scope-frame-sm w-full py-2 font-scope font-semibold text-[11px] uppercase tracking-wide transition-all duration-300 cursor-pointer border ${
                      tier.premium
                        ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-400 hover:text-black active:scale-[0.98] scope-glow"
                        : tier.topTier
                        ? "border-slate-300/60 bg-slate-900/40 text-slate-200 hover:bg-slate-200 hover:text-slate-900 active:scale-[0.98]"
                        : "border-cyan-900/50 bg-slate-900/60 text-slate-500 hover:text-cyan-400 hover:border-cyan-700/60"
                    }`}
                  >
                    {tier.monthly === 0 ? "System Loaded" : "Purchase Permissions Card"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* COMPARISON MATRIX */}
      <div className="scope-frame scope-frame-lg border border-slate-800/60 bg-slate-950/30 backdrop-blur-xs overflow-hidden shrink-0">
        <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-900 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Permissions Comparison Matrix</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono min-w-[560px]">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 text-[9px] uppercase tracking-wider">
                <th className="text-left font-black px-4 py-2">Permission</th>
                <th className="text-center font-black px-3 py-2">Standard</th>
                <th className="text-center font-black px-3 py-2 text-cyan-400">Elite</th>
                <th className="text-center font-black px-3 py-2 text-slate-300">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/70">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="text-slate-300">
                  <td className="px-4 py-2 leading-tight">{row.label}</td>
                  <td className="text-center px-3 py-2">
                    {row.standard ? <CheckCircle className="w-3.5 h-3.5 text-slate-500 inline" /> : <Lock className="w-3 h-3 text-slate-800 inline" />}
                  </td>
                  <td className="text-center px-3 py-2">
                    {row.elite ? <CheckCircle className="w-3.5 h-3.5 text-cyan-500 inline" /> : <Lock className="w-3 h-3 text-slate-800 inline" />}
                  </td>
                  <td className="text-center px-3 py-2">
                    {row.command ? <CheckCircle className="w-3.5 h-3.5 text-slate-300 inline" /> : <Lock className="w-3 h-3 text-slate-800 inline" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PILOT TRANSMISSIONS — in-universe flavor quotes from the same
          fictional callsigns already seeded in The Comm-Link roster. */}
      <div className="space-y-2.5 shrink-0">
        <div className="font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5" /> Incoming Pilot Transmissions
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TRANSMISSIONS.map((t, idx) => (
            <div key={idx} className="scope-frame p-3.5 border border-slate-800/60 bg-slate-950/30 backdrop-blur-xs space-y-2">
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-slate-900/60">
                <span className="text-cyan-400 font-bold uppercase">{t.callsign}</span>
                <span className="text-slate-600 uppercase tracking-wide">{t.tier}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ ACCORDION */}
      <div className="scope-frame scope-frame-lg border border-slate-800/60 bg-slate-950/20 backdrop-blur-xs overflow-hidden shrink-0 mb-1">
        <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-900 flex items-center gap-2">
          <Award className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-scope text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Frequently Logged Transmissions</span>
        </div>
        <div className="divide-y divide-slate-900/70 pointer-events-auto">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx}>
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer hover:bg-slate-900/20 transition-colors"
                >
                  <span className="text-[11px] font-semibold text-slate-200 font-sans">{faq.q}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 text-[11px] text-slate-400 font-sans leading-relaxed animate-fade-in">{faq.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
