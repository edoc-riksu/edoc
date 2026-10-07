"use client";

import React, { useEffect, useRef } from "react";

export default function CinematicGalaxyBackground() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let particles = [];
    const particleCount = 3500; // High density particle field

    // Handles window resizing safely and maintains absolute high sharpness
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      initGalaxy();
    };

    // Generates mathematically precise logarithmic spiral arms with variance
    const initGalaxy = () => {
      particles = [];
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Mathematical constraints for dual logarithmic spiral arms
      const a = 12; // Core size factor
      const b = 0.28; // Arm tightness curvature

      for (let i = 0; i < particleCount; i++) {
        // Distribute half the particles dynamically to the core, and half along the outer reaches
        const distanceFactor = Math.pow(Math.random(), 2.5);
        const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 0.65;
        const distance = distanceFactor * maxRadius;

        // Choose between 2 primary spiral arms (offset by PI radians)
        const armAngle = Math.random() > 0.5 ? 0 : Math.PI;

        // Inverse logarithmic spiral equation to calculate standard angle positions based on distance
        const spiralAngle = Math.log(Math.max(distance, 1) / a) / b;

        // Add random spread variance so arms are thick gas nebulae, not single pixel strings
        const spread = (Math.random() - 0.5) * (45 / (distanceFactor * 10 + 1)) * (Math.PI / 180);
        const angle = spiralAngle + armAngle + spread;

        // Determine base coordinate mapping
        const baseX = Math.cos(angle) * distance;
        const baseY = Math.sin(angle) * distance;

        // Visual properties based strictly on distance from core center
        const size = Math.max(0.4, Math.random() * 2.2 * (1 - distanceFactor * 0.7));
        const alpha = Math.min(1, Math.max(0.15, Math.random() * (1.2 - distanceFactor)));

        // Multi-tier color system based on proximity to center mass
        let color = "rgba(224, 247, 250, "; // Neon White core fallback
        if (distanceFactor < 0.12) {
          // Absolute intense white/cyan center nucleus
          color = Math.random() > 0.3 ? `rgba(255, 255, 255, ` : `rgba(0, 240, 255, `;
        } else if (distanceFactor < 0.45) {
          // Mid-range cosmic vibrant purples and neon violet hues
          color = Math.random() > 0.4 ? `rgba(124, 77, 255, ` : `rgba(186, 104, 200, `;
        } else {
          // Distant outer gas reaches fading cleanly to deep starlight indigo blue
          color = Math.random() > 0.5 ? `rgba(26, 35, 126, ` : `rgba(13, 71, 161, `;
        }

        particles.push({
          x: centerX + baseX,
          y: centerY + baseY,
          baseX,
          baseY,
          size,
          alpha,
          color,
          angle,
          distance,
          speed: (0.0008 + Math.random() * 0.0012) * (1 - distanceFactor * 0.5), // Inner rings spin faster than outer edges
          armOffset: Math.random() * 0.05
        });
      }
    };

    // Tracks cursor targets for smooth cinematic dampening adjustments
    const handleMouseMove = (e) => {
      mouseRef.current.targetX = (e.clientX - window.innerWidth / 2) * 0.08;
      mouseRef.current.targetY = (e.clientY - window.innerHeight / 2) * 0.08;
    };

    // Tracks mobile gyroscope tilt data shifts accurately
    const handleDeviceOrientation = (e) => {
      if (e.gamma && e.beta) {
        mouseRef.current.targetX = e.gamma * 1.5;
        mouseRef.current.targetY = (e.beta - 45) * 1.5;
      }
    };

    // The core execution render loop running at smooth 60fps refresh updates
    const renderLoop = () => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Linear interpolation (lerp) calculations to smoothly damp camera movements
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Wipe background canvas frame while keeping alpha values blending cleanly
      ctx.fillStyle = "rgba(6, 6, 15, 1)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Render a deep volumetric glowing center cloud effect underneath particle meshes
      const glowGrad = ctx.createRadialGradient(
        centerX + mouseRef.current.x,
        centerY + mouseRef.current.y,
        0,
        centerX + mouseRef.current.x,
        centerY + mouseRef.current.y,
        Math.min(window.innerWidth, window.innerHeight) * 0.35
      );
      glowGrad.addColorStop(0, "rgba(0, 75, 150, 0.25)");
      glowGrad.addColorStop(0.3, "rgba(75, 0, 130, 0.12)");
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Render, update, and rotate particle coordinates smoothly
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Increment rotation paths independently based on custom speed parameters
        p.angle += p.speed;

        // Re-map localized base relative coordinate values using updating trigonometry vectors
        p.baseX = Math.cos(p.angle) * p.distance;
        p.baseY = Math.sin(p.angle) * p.distance;

        // Apply global translation tracking vectors paired directly with camera mouse modifiers
        p.x = centerX + p.baseX + mouseRef.current.x * (1 + p.distance * 0.001);
        p.y = centerY + p.baseY + mouseRef.current.y * (1 + p.distance * 0.001);

        // Draw particle node to canvas context
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    // Attach interaction event listeners cleanly
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("deviceorientation", handleDeviceOrientation);

    // Bootstrap setup cycles instantly
    resizeCanvas();
    renderLoop();

    // Prevent memory leaks on component unmount loops
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 -z-20 pointer-events-none block overflow-hidden bg-[#06060f]"
    />
  );
}
