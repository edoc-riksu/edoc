"use client";
import React, { useEffect, useState } from "react";
import { usePilot } from "../context/PilotContext";
import { ShieldAlert, Radio, Cpu } from "lucide-react";

export default function AirlockVideoPlayer() {
  const { airlockStage, setAirlockStage, triggerAirlockAudio } = usePilot();
  const [loadPercentage, setLoadPercentage] = useState(0);

  useEffect(() => {
    if (airlockStage !== "LOADING") return;
    triggerAirlockAudio("CHARGE");

    const loadTimer = setInterval(() => {
      setLoadPercentage((prev) => {
        if (prev >= 100) {
          clearInterval(loadTimer);
          setAirlockStage("ARMED");
          return 100;
        }
        return prev + 1;
      });
    }, 24); 

    return () => clearInterval(loadTimer);
  }, [airlockStage, setAirlockStage]);

  const handleLaunchVerification = () => {
    if (airlockStage !== "ARMED") return;
    triggerAirlockAudio("UNLATCH");
    setAirlockStage("UNLATCHING");
    
    setTimeout(() => {
      setAirlockStage("FLIGHT_ACTIVE");
    }, 1000);
  };

  if (airlockStage === "FLIGHT_ACTIVE") return null;

  return (
    <div 
      className="absolute inset-0 w-full h-full z-40 bg-transparent flex items-center justify-center font-mono transition-opacity duration-1000 ease-in-out pointer-events-none"
      style={{ opacity: airlockStage === "UNLATCHING" ? 0 : 1 }}
    >
      
      {/* CORNER TECH RETICLES */}
      <div className="absolute top-8 left-8 border-t border-l border-cyan-500/30 w-6 h-6"></div>
      <div className="absolute top-8 right-8 border-t border-r border-cyan-500/30 w-6 h-6"></div>
      <div className="absolute bottom-8 left-8 border-b border-l border-cyan-500/30 w-6 h-6"></div>
      <div className="absolute bottom-8 right-8 border-b border-r border-cyan-500/30 w-6 h-6"></div>

      {/* CENTRAL COMPACT READOUT MODULE */}
      <div className="w-64 bg-slate-950/80 backdrop-blur-md border border-cyan-500/20 p-4 rounded shadow-2xl text-center pointer-events-auto">
        {airlockStage === "LOADING" ? (
          <div className="space-y-2 py-2 animate-pulse">
            <Cpu className="w-4 h-4 mx-auto text-cyan-400 animate-spin-slow" />
            <div className="text-[7px] text-slate-500 font-black tracking-widest uppercase flex items-center gap-1 justify-center">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" /> INITIALIZING AVIONICS CONNECTIONS...
            </div>
            <div className="text-xs font-black text-cyan-400 text-shadow-cyan">{loadPercentage}%</div>
          </div>
        ) : (
          <button
            onClick={handleLaunchVerification}
            className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-none group py-1"
          >
            <ShieldAlert className="w-4 h-4 text-amber-500 animate-bounce" />
            <div className="text-[7px] text-amber-500 font-black tracking-widest uppercase">AVIONICS BALANCED // COCKPIT SECURE</div>
            <div className="text-[9px] text-cyan-400 font-black uppercase tracking-widest bg-cyan-950/40 border border-cyan-500/30 w-full py-2 rounded mt-1 hover:bg-cyan-400 hover:text-black hover:border-cyan-400 transition-colors">
              ENGAGE MISSION FLIGHT
            </div>
          </button>
        )}
      </div>

    </div>
  );
}