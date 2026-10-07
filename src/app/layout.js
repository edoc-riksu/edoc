"use client";
import React, { useEffect, useState, useRef } from "react";
import "./globals.css";
import { PilotProvider } from "../context/PilotContext";
import SystemChrome from "../components/ui/SystemChrome";
import CinematicGalaxyBackground from "../components/ui/CinematicGalaxyBackground";

export default function RootLayout({ children }) {
  const [mouse, setMouse] = useState({ x: -100, y: -100 });
  const [angle, setAngle] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const moveTimeout = useRef(null);

  useEffect(() => {
    // 1. Vector Custom Rocket Pointer tracking logic
    const processCursorDynamics = (e) => {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        setAngle(targetAngle);
        setIsMoving(true);
        
        clearTimeout(moveTimeout.current);
        moveTimeout.current = setTimeout(() => setIsMoving(false), 150);
      }

      setMouse({ x: e.clientX, y: e.clientY });
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    // 🌟 2. HARDWARE SCALING BLOCKER (Prevents trackpads from zooming text or columns)
    const blockNativePageZoom = (e) => {
      if (e.ctrlKey || e.scale !== undefined && e.scale !== 1) {
        e.preventDefault(); // Intercepts browser viewport pinch alterations completely
      }
    };

    window.addEventListener("mousemove", processCursorDynamics, { passive: true });
    window.addEventListener("wheel", blockNativePageZoom, { passive: false });
    window.addEventListener("touchmove", blockNativePageZoom, { passive: false });

    return () => {
      window.removeEventListener("mousemove", processCursorDynamics);
      window.removeEventListener("wheel", blockNativePageZoom);
      window.removeEventListener("touchmove", blockNativePageZoom);
      clearTimeout(moveTimeout.current);
    };
  }, []);

  return (
    <html lang="en" className="bg-black select-none cursor-none overflow-hidden touch-none">
      <body className="antialiased w-screen h-screen relative bg-black cursor-none overflow-hidden touch-none">
        {/* 🌌 PERMANENT CINEMATIC GALAXY BACKGROUND — fixed, full-viewport,
            sits behind every screen via its own -z-20. Mounted once at the
            root so Star Chart Radar / Flight Academy / every other screen's
            now-transparent glass panels let it shine through underneath. */}
        <CinematicGalaxyBackground />

        <PilotProvider>

          {/* 🚀 CUSTOM ROCKET MOUSE VECTOR STARSHIP */}
          <div 
            className="hidden md:block fixed pointer-events-none z-[200] mix-blend-screen"
            style={{
              left: `${mouse.x}px`,
              top: `${mouse.y}px`,
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              transition: "transform 0.06s ease-out"
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 20L12 16L20 20L12 2Z" stroke="#22d3ee" strokeWidth="2" fill="rgba(6,182,212,0.15)" strokeLinejoin="round"/>
            </svg>

            {isMoving && (
              <div 
                className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-1.5 bg-gradient-to-b from-cyan-400 via-teal-400 to-transparent blur-xs rounded"
                style={{ height: "18px", boxShadow: "0 0 10px #06b6d4" }}
              ></div>
            )}
          </div>

          {children}

          {/* 🧰 PERSISTENT CANOPY OVERLAY LAYER (boot / palette / alerts) */}
          <SystemChrome />
        </PilotProvider>
      </body>
    </html>
  );
}
