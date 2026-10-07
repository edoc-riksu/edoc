"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function WarpTransitionOverlay({ isTransitioning, onComplete, planetName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isTransitioning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId;
    const stars = [];
    const starCount = 450;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width - canvas.width / 2,
        y: Math.random() * canvas.height - canvas.height / 2,
        z: Math.random() * canvas.width,
        oX: 0,
        oY: 0
      });
    }

    let velocity = 2;
    let timer = 0;

    const animateWarp = () => {
      ctx.fillStyle = "rgba(6, 6, 18, 0.25)"; // Trails effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Accelerate velocity aggressively
      velocity += 0.45;
      timer += 1;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.z -= velocity;

        if (s.z <= 0) {
          s.z = canvas.width;
          s.x = Math.random() * canvas.width - canvas.width / 2;
          s.y = Math.random() * canvas.height - canvas.height / 2;
        }

        const k = 120 / s.z;
        const px = s.x * k + cx;
        const py = s.y * k + cy;

        if (s.oX !== 0) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0, 240, 255, ${Math.min(1, (1 - s.z / canvas.width) * 1.5)})`;
          ctx.lineWidth = Math.min(3, k * 0.8);
          ctx.moveTo(s.oX, s.oY);
          ctx.lineTo(px, py);
          ctx.stroke();
        }

        s.oX = px;
        s.oY = py;
      }

      if (timer < 90) {
        animationId = requestAnimationFrame(animateWarp);
      } else {
        onComplete();
      }
    };

    animateWarp();
    return () => cancelAnimationFrame(animationId);
  }, [isTransitioning, onComplete]);

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060612]"
        >
          <canvas ref={canvasRef} className="absolute inset-0 block" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 text-center"
          >
            <h2 className="text-xs font-mono tracking-[0.4em] text-cyan-400 uppercase animate-pulse">
              Jumping to Hyperspace
            </h2>
            <h1 className="mt-2 text-3xl font-extrabold tracking-wider text-white uppercase drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]">
              Approaching {planetName} Sector
            </h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
