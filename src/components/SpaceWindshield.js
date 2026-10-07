"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { usePilot } from "../context/PilotContext";
import { publishOrbit, commitOrbitFrame } from "../lib/orbitalTelemetry";
import { PLANETARY_SYSTEM } from "../lib/planetarySystem";

/**
 * 🪐 SCOPE-STYLE PLANETARY VIEWPORT
 * -------------------------------------------------------------
 * Modelled after Solar System Scope's own explorer: real textured
 * 3D bodies (not flat-shaded spheres), continuous drag-to-orbit +
 * scroll-to-zoom camera handling, and a click-to-focus flow that
 * flies the camera to whichever body was picked — either from the
 * 2D radar (`currentTarget`) or directly out of this 3D view when
 * `onSelectPlanet` is wired up (cockpit only; the cinematic landing
 * hero leaves it unset and behaves exactly as before).
 */

/** Small deterministic hash so per-planet texture noise is stable across a render but still varies planet-to-planet. */
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex, amount) {
  const c = new THREE.Color(hex);
  if (amount >= 0) c.lerp(new THREE.Color(0xffffff), amount);
  else c.lerp(new THREE.Color(0x000000), -amount);
  return `#${c.getHexString()}`;
}

/** Equirectangular body texture: banded gas-giant, mottled rock, or streaked ice — picked from the sector's classification. */
function createPlanetTexture(hex, classification, seedNum) {
  const rand = mulberry32(seedNum);
  const w = 256;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, w, h);

  const style = classification === "Gas Giant" || classification === "Ringed Archive"
    ? "banded"
    : classification === "Ice Spire" || classification === "Cryo Geyser"
    ? "ice"
    : "rocky";

  if (style === "banded") {
    let y = 0;
    while (y < h) {
      const bandH = 6 + rand() * 16;
      const tone = (rand() - 0.5) * 0.4;
      ctx.fillStyle = shade(hex, tone);
      ctx.globalAlpha = 0.55 + rand() * 0.35;
      ctx.fillRect(0, y, w, bandH);
      y += bandH;
    }
    ctx.globalAlpha = 1;
    // A single storm spot, Jupiter-style.
    const sx = w * (0.2 + rand() * 0.6);
    const sy = h * (0.3 + rand() * 0.4);
    const grad = ctx.createRadialGradient(sx, sy, 1, sx, sy, 18);
    grad.addColorStop(0, shade(hex, 0.35));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "ice") {
    for (let i = 0; i < 90; i += 1) {
      const x = rand() * w;
      const yy = rand() * h;
      const len = 10 + rand() * 40;
      const ang = rand() * Math.PI;
      ctx.strokeStyle = shade(hex, rand() > 0.5 ? 0.3 : -0.15);
      ctx.globalAlpha = 0.15 + rand() * 0.25;
      ctx.lineWidth = 1 + rand() * 2;
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + Math.cos(ang) * len, yy + Math.sin(ang) * len * 0.3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Polar sheen, top and bottom.
    ctx.fillStyle = shade(hex, 0.5);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, w, h * 0.12);
    ctx.fillRect(0, h * 0.88, w, h * 0.12);
    ctx.globalAlpha = 1;
  } else {
    for (let i = 0; i < 130; i += 1) {
      const x = rand() * w;
      const yy = rand() * h;
      const r = 4 + rand() * 14;
      const grad = ctx.createRadialGradient(x, yy, 0, x, yy, r);
      const tone = rand() > 0.5 ? 0.22 : -0.22;
      grad.addColorStop(0, shade(hex, tone));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.35 + rand() * 0.3;
      ctx.beginPath();
      ctx.ellipse(x, yy, r, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Radial cross-section for a ring — banded alpha so it reads as real debris, not a flat disc. RingGeometry maps v (0→1) from inner to outer radius, so a 1px-wide vertical gradient is all that's needed. */
function createRingTexture(hex, seedNum) {
  const rand = mulberry32(seedNum);
  const w = 2;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);

  const base = new THREE.Color(hex);
  for (let y = 0; y < h; y += 1) {
    const t = y / h;
    const envelope = Math.sin(t * Math.PI); // fades in/out at both edges
    const gap = 0.55 + 0.45 * Math.sin(t * 38 + rand() * 2);
    const alpha = Math.max(0, envelope * gap * 0.75);
    ctx.fillStyle = `rgba(${Math.round(base.r * 255)}, ${Math.round(base.g * 255)}, ${Math.round(base.b * 255)}, ${alpha})`;
    ctx.fillRect(0, y, w, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export default function SpaceWindshield({ speed = 1, currentTarget = null, interactive = true, onSelectPlanet = null, landingSequence = false }) {
  const mountRef = useRef(null);
  const targetRef = useRef(currentTarget);
  const onSelectRef = useRef(onSelectPlanet);
  const landingSequenceRef = useRef(landingSequence);
  const { virtualScroll, targetVirtualScroll, setTargetVirtualScroll, setWarpSpeed } = usePilot();

  const scrollRef = useRef(virtualScroll);
  const targetScrollRef = useRef(targetVirtualScroll);
  const mousePointer = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  // 🚦 speed/interactive change on nearly every nav click, scroll tap and
  // travel-sequence phase — kept in refs (like every other live prop here)
  // so the heavy scene-setup effect below never re-runs because of them.
  // It used to list them as dependencies, which tore down and rebuilt the
  // entire renderer/composer/65k-star field/every planet texture on each
  // change — the actual cause of the stutter, not just a missed optimization.
  const speedRef = useRef(speed);
  const interactiveRef = useRef(interactive);

  useEffect(() => { targetRef.current = currentTarget; }, [currentTarget]);
  useEffect(() => { onSelectRef.current = onSelectPlanet; }, [onSelectPlanet]);
  useEffect(() => { landingSequenceRef.current = landingSequence; }, [landingSequence]);
  useEffect(() => { scrollRef.current = virtualScroll; }, [virtualScroll]);
  useEffect(() => { targetScrollRef.current = targetVirtualScroll; }, [targetVirtualScroll]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { interactiveRef.current = interactive; }, [interactive]);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. High-Performance Three.js Camera & Deep Cinematic Atmosphere
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010206, 0.00008);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 22000);
    camera.position.set(0, 4800, 5200); // Startup deep space position

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // 🌌 Transparent clear — this windshield's own starfield (below) now
    // stays out of the scene graph, so the permanent 2D CinematicGalaxyBackground
    // mounted at the root layout shows straight through the empty space
    // around these 3D bodies, with the bloom/composite pipeline (which already
    // tracks alpha through its blend shaders) compositing correctly over it.
    renderer.setClearColor(0x000000, 0);
    // Bloom is a full-resolution multi-pass blur, so its cost scales with
    // the pixel count the composer renders at — capping the ratio lower
    // than "true" device resolution keeps that cost in check on weaker/
    // integrated GPUs without a visibly softer image.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.2;
    currentMount.appendChild(renderer.domElement);

    // 2. High-Contrast Volumetric Space Light Mapping
    const ambientLight = new THREE.AmbientLight(0x111827, 2.5); // Deep slate space baseline illumination
    scene.add(ambientLight);

    const createSharpPointTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 32; canvas.height = 32;
      const ctx = canvas.getContext("2d");

      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.25, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true; return texture;
    };
    const sharpStarTexture = createSharpPointTexture();

    // 🌟 3. SPACEENGINE-STYLE POST-PROCESSING BLOOM ENHANCEMENT
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // UnrealBloomPass tweaks: (Resolution Vector, Strength, Radius, Threshold)
    // Threshold dropped to 0.05 so stars don't get filtered out into black blocks!
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.2, 0.85, 0.05);
    composer.addPass(bloomPass);

    // 🌟 4. RE-CALIBRATING 65,000 VOLUMETRIC HIGH-LUMINANCE STARS
    const galaxyGeometry = new THREE.BufferGeometry();
    const galaxyStarsCount = 65000;
    const galaxyPositions = new Float32Array(galaxyStarsCount * 3);
    const galaxyColors = new Float32Array(galaxyStarsCount * 3);

    const armsCount = 2;
    const colorSpectrum = [
      new THREE.Color(0xfffad2), // Bright core stars
      new THREE.Color(0x38bdf8), // Orion lane cyan
      new THREE.Color(0x818cf8)  // Outer perimeter indigo
    ];

    for (let i = 0; i < galaxyStarsCount; i++) {
      const distance = Math.pow(Math.random(), 3.0) * 4200;
      const armAngle = ((i % armsCount) * (Math.PI * 2)) / armsCount;
      const spiralTightness = 0.0016;
      const angle = armAngle + distance * spiralTightness;

      const scatterX = (Math.random() - 0.5) * (520 * (distance / 4200 + 0.1));
      const scatterZ = (Math.random() - 0.5) * (520 * (distance / 4200 + 0.1));
      const randomY = (Math.random() - 0.5) * 220 * (1 - distance / 4200);

      galaxyPositions[i * 3] = Math.cos(angle) * distance + scatterX;
      galaxyPositions[i * 3 + 1] = randomY;
      galaxyPositions[i * 3 + 2] = Math.sin(angle) * distance + scatterZ;

      let starColor = colorSpectrum[Math.floor(Math.random() * colorSpectrum.length)];
      galaxyColors[i * 3] = starColor.r;
      galaxyColors[i * 3 + 1] = starColor.g;
      galaxyColors[i * 3 + 2] = starColor.b;
    }
    galaxyGeometry.setAttribute("position", new THREE.BufferAttribute(galaxyPositions, 3));
    galaxyGeometry.setAttribute("color", new THREE.BufferAttribute(galaxyColors, 3));

    // Force Point Material parameters to look for luminous blending values
    const milkyWayMesh = new THREE.Points(galaxyGeometry, new THREE.PointsMaterial({
      size: 5.5,
      vertexColors: true,
      map: sharpStarTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending, // Forces overlapping star colors to bleach into pure white glow vectors
      depthWrite: false
    }));
    // Not added to the scene any more — the permanent 2D CinematicGalaxyBackground
    // (mounted once at the root layout, now visible through this windshield's
    // transparent clear) is the sole starfield. `milkyWayMesh` is left fully
    // constructed and still spun in the animate loop below so nothing else
    // in this file has to change, it's simply never part of the render.
    // scene.add(milkyWayMesh);

    // 🌠 HYPERSPACE STREAK FIELD — real geometry, not a CSS overlay. Thin
    // additive-blended lines parented directly to the camera so they always
    // radiate from dead-center of wherever the pilot is looking, rushing
    // toward the lens as `speed` climbs — the actual "flying through the
    // stars" sensation for nav pulses, scroll-zoom taps, and especially a
    // travel-sequence warp jump. Fully dormant (opacity 0) at rest, so
    // normal exploration looks exactly as it always has.
    scene.add(camera);
    const streakCount = 700;
    const streakGeometry = new THREE.BufferGeometry();
    const streakPositions = new Float32Array(streakCount * 2 * 3);
    streakGeometry.setAttribute("position", new THREE.BufferAttribute(streakPositions, 3));
    const streakState = new Float32Array(streakCount * 3); // [radius, angle, headZ] per streak
    const spawnStreak = (idx, farBehind) => {
      streakState[idx * 3] = 24 + Math.random() * 420;
      streakState[idx * 3 + 1] = Math.random() * Math.PI * 2;
      streakState[idx * 3 + 2] = farBehind ? -2600 - Math.random() * 600 : -300 - Math.random() * 2600;
    };
    for (let i = 0; i < streakCount; i++) spawnStreak(i, false);
    const streakMaterial = new THREE.LineBasicMaterial({
      color: 0xcfeeff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const hyperspaceStreaks = new THREE.LineSegments(streakGeometry, streakMaterial);
    hyperspaceStreaks.frustumCulled = false;
    camera.add(hyperspaceStreaks);

    // 5. SOLAR SYSTEM — real textured 3D bodies, Scope-style
    const solarSystemGroup = new THREE.Group();
    const solarArmX = 1500;
    const solarArmZ = 1200;
    solarSystemGroup.position.set(solarArmX, 0, solarArmZ);
    scene.add(solarSystemGroup);

    const localSunLight = new THREE.PointLight(0xffffff, 9, 4000, 0.2);
    solarSystemGroup.add(localSunLight);

    const sunCore = new THREE.Mesh(new THREE.SphereGeometry(24, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    solarSystemGroup.add(sunCore);
    const sunCorona = new THREE.Mesh(new THREE.SphereGeometry(36, 32, 32), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.2, side: THREE.BackSide }));
    solarSystemGroup.add(sunCorona);
    // 🌟 Wider, softer outer halo — Solar System Scope's sun render leans
    // hard on a broad secondary bloom ring outside the bright disc, which
    // the tight 36-unit corona above doesn't reach on its own.
    const sunOuterHalo = new THREE.Mesh(new THREE.SphereGeometry(64, 32, 32), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.07, side: THREE.BackSide }));
    solarSystemGroup.add(sunOuterHalo);

    // Single source of truth (src/lib/planetarySystem.js) — the 2D radar,
    // the academy grid and this 3D view all read the exact same bodies now.
    const planetarySystem = PLANETARY_SYSTEM.map((p, idx) => ({
      id: p.id,
      color: parseInt(p.hex.replace("#", ""), 16),
      colorHex: p.hex,
      size: p.bodySize,
      radius: p.orbitRadius,
      speed: p.orbitSpeed,
      auraColor: parseInt(p.auraHex.replace("#", ""), 16),
      hasRings: !!p.hasRings,
      classification: p.classification,
      tilt: 0.06 + ((idx * 37) % 10) / 10 * 0.28
    }));

    const planetMeshes = [];
    const sphereGeo = new THREE.SphereGeometry(1, 40, 40);
    const moonGeo = new THREE.SphereGeometry(1, 16, 16);
    const raycastTargets = [];

    planetarySystem.forEach((p, idx) => {
      const bodyTexture = createPlanetTexture(p.colorHex, p.classification, idx * 911 + 7);
      const mat = new THREE.MeshStandardMaterial({
        map: bodyTexture,
        roughness: 0.75,
        metalness: 0.05,
        emissive: p.color,
        emissiveIntensity: 0.06
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.scale.setScalar(p.size);
      mesh.userData = { planetId: p.id };
      raycastTargets.push(mesh);

      const groupWrapper = new THREE.Group();
      groupWrapper.rotation.z = p.tilt;
      groupWrapper.add(mesh);

      const auraMesh = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: p.auraColor, transparent: true, opacity: 0.15, side: THREE.BackSide }));
      auraMesh.scale.setScalar(p.size * 1.25);
      groupWrapper.add(auraMesh);

      if (p.hasRings) {
        const ringTexture = createRingTexture(p.auraColor, idx * 613 + 3);
        const ringMesh = new THREE.Mesh(
          new THREE.RingGeometry(p.size * 1.3, p.size * 2.1, 96, 1),
          new THREE.MeshBasicMaterial({ map: ringTexture, side: THREE.DoubleSide, transparent: true, depthWrite: false })
        );
        ringMesh.rotation.x = Math.PI / 2;
        groupWrapper.add(ringMesh);
      }

      // A single small moon — cheap, but it's the detail that reads as a
      // "real" planetary body rather than a flat orbiting marker.
      const moonMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9, metalness: 0.05 });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      const moonOrbitRadius = p.size * 2.3;
      const moonScale = Math.max(0.9, p.size * 0.16);
      moon.scale.setScalar(moonScale);
      groupWrapper.add(moon);

      groupWrapper.userData = {
        ...p,
        angle: Math.random() * Math.PI * 2,
        coreMesh: mesh,
        moonMesh: moon,
        moonAngle: Math.random() * Math.PI * 2,
        moonSpeed: 0.02 + Math.random() * 0.01,
        moonOrbitRadius
      };
      solarSystemGroup.add(groupWrapper);
      planetMeshes.push(groupWrapper);

      const orbitLine = new THREE.Mesh(new THREE.RingGeometry(p.radius - 0.5, p.radius + 0.5, 128), new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide, transparent: true, opacity: 0.3 }));
      orbitLine.rotation.x = Math.PI / 2;
      solarSystemGroup.add(orbitLine);
    });

    const cinematicSplinePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 4800, 5200),
      new THREE.Vector3(800, 2400, 3200),
      new THREE.Vector3(1200, 1100, 1900),
      new THREE.Vector3(solarArmX, 380, solarArmZ + 800),
      new THREE.Vector3(solarArmX, 220, solarArmZ + 550)
    ]);

    let cameraRotation = { azimuth: 0, polar: 0 };
    let dragVelocity = { azimuth: 0, polar: 0 };
    // INITIALIZE TIMELINE FLIGHT VARIANT REGISTERS
    let zoomDist = 1100;
    let isDragging = false;
    let dragMoved = 0;
    let prevPos = { x: 0, y: 0 };
    let downPos = { x: 0, y: 0 };

    // Scope-style local orbit around whichever body is currently focused —
    // separate from the free-flight camera above so drag/zoom keep working
    // (around the planet instead of the whole scene) once something is locked.
    const focusOrbit = { azimuth: 0.5, polar: 0.28, zoom: 60, minZoom: 30 };
    let lastFocusId = null;

    const raycaster = new THREE.Raycaster();
    const ndcMouse = new THREE.Vector2(2, 2); // parked off-screen until first move
    let hoveredId = null;

    // Floating hover chip — Scope shows a small "NAME / EXPLORE" tag near
    // whatever body the pointer is over. Only meaningful once something is
    // clickable in this view, i.e. when onSelectPlanet is wired up.
    const label = document.createElement("div");
    label.style.cssText = "position:absolute;left:0;top:0;transform:translate(-9999px,-9999px);pointer-events:none;z-index:20;padding:4px 10px;font-family:var(--font-scope,ui-sans-serif),sans-serif;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#a5f3fc;background:rgba(8,20,28,0.72);border:1px solid rgba(34,211,238,0.4);white-space:nowrap;transition:opacity 0.12s ease;opacity:0;clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)";
    currentMount.appendChild(label);

    // 6. HYPER-ISOLATED SECTOR CHANNELS (Film Transition Listeners)
    const onMouseDown = (e) => {
      if (!interactiveRef.current) return;
      if (e.target.tagName === "CANVAS") {
        isDragging = true;
        dragMoved = 0;
        prevPos = { x: e.clientX, y: e.clientY };
        downPos = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e) => {
      mousePointer.current.targetX = (e.clientX / window.innerWidth - 0.5) * 160;
      mousePointer.current.targetY = (e.clientY / window.innerHeight - 0.5) * 100;
      ndcMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      ndcMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (!isDragging || !interactiveRef.current) return;
      const currentX = e.clientX;
      const currentY = e.clientY;
      const deltaX = currentX - prevPos.x;
      const deltaY = currentY - prevPos.y;
      dragMoved += Math.abs(deltaX) + Math.abs(deltaY);

      if (targetRef.current) {
        // Orbiting the focused body — same drag gesture, local pivot.
        focusOrbit.azimuth -= deltaX * 0.0045;
        focusOrbit.polar = Math.max(-1.2, Math.min(1.2, focusOrbit.polar - deltaY * 0.0045));
      } else {
        dragVelocity.azimuth = deltaX * 0.003;
        dragVelocity.polar = deltaY * 0.003;
        cameraRotation.azimuth -= dragVelocity.azimuth;
        cameraRotation.polar = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraRotation.polar - dragVelocity.polar));
      }
      prevPos = { x: currentX, y: currentY };
    };

    const onMouseUp = (e) => {
      isDragging = false;
      if (!interactiveRef.current || !onSelectRef.current) return;
      if (dragMoved > 6) return; // a real drag, not a click
      if (Math.abs(e.clientX - downPos.x) + Math.abs(e.clientY - downPos.y) > 6) return;

      raycaster.setFromCamera(ndcMouse, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.planetId;
        onSelectRef.current(targetRef.current === hitId ? null : hitId);
      } else if (targetRef.current) {
        onSelectRef.current(null);
      }
    };

    const onGlobalWheelTrack = (e) => {
      if (!interactiveRef.current) return;

      if (targetRef.current) {
        // Continuous zoom in on the focused body, Scope-style — clamped so
        // the camera can never punch through the planet's own glow shell.
        focusOrbit.zoom = Math.max(focusOrbit.minZoom, Math.min(400, focusOrbit.zoom + e.deltaY * 0.12));
        return;
      }

      // Update floating virtual scroll parameters continuously from 0.0 to 4.0
      setTargetVirtualScroll((prev) => {
        return Math.max(0, Math.min(4, prev + e.deltaY * 0.0022));
      });

      // Adjust camera lens depth scale seamlessly
      zoomDist = Math.max(400, Math.min(1800, zoomDist + e.deltaY * 0.45));

      setWarpSpeed(4);
      const settleStars = setTimeout(() => setWarpSpeed(1), 120);
      return () => clearTimeout(settleStars);
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("wheel", onGlobalWheelTrack, { passive: true });

    // 7. Post-Processed Cinematic Animation Execution Loop
    let frameId;
    let cameraTargetPos = new THREE.Vector3();
    let lookTargetPos = new THREE.Vector3(0, 0, 0);
    const worldGlobalPos = new THREE.Vector3();
    const labelProject = new THREE.Vector3();

    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const targetId = targetRef.current;
      let focalGroup = null;

      if (targetId !== lastFocusId) {
        // Freshly focused body — start from a flattering default angle
        // instead of carrying over whatever the last planet was showing.
        focusOrbit.azimuth = 0.5;
        focusOrbit.polar = 0.28;
        lastFocusId = targetId;
      }

      const speedNow = speedRef.current;
      planetMeshes.forEach((group) => {
        if (!targetId) group.userData.angle += group.userData.speed * speedNow * 0.16;
        group.position.x = Math.cos(group.userData.angle) * group.userData.radius;
        group.position.z = Math.sin(group.userData.angle) * group.userData.radius;
        group.userData.coreMesh.rotation.y += 0.006;

        group.userData.moonAngle += group.userData.moonSpeed * speedNow;
        group.userData.moonMesh.position.set(
          Math.cos(group.userData.moonAngle) * group.userData.moonOrbitRadius,
          0,
          Math.sin(group.userData.moonAngle) * group.userData.moonOrbitRadius
        );

        // 📡 Publish this body's angle so 2D HUD surfaces (Star Chart radar)
        // can plot the exact same orbital state without any React re-render.
        publishOrbit(group.userData.id, group.userData.angle);

        if (targetId === group.userData.id) {
          focalGroup = group;
          focusOrbit.minZoom = group.userData.size * 2.6;
          if (targetId !== lastFocusId) {
            // A deliberate travel sequence starts the approach from much
            // further out — Scope's snappy "inspect this body" lock-on
            // (5.5x) reads as instant; a real flight-through-the-galaxy
            // needs a longer final stretch to actually feel like arriving.
            const startMultiplier = landingSequenceRef.current ? 16 : 5.5;
            focusOrbit.zoom = Math.max(focusOrbit.minZoom, group.userData.size * startMultiplier);
          }
        }
      });
      commitOrbitFrame();

      // 🌠 Hyperspace streaks: rush toward the camera along its local view
      // axis, faster and longer the higher `speed` climbs.
      const streakDrive = Math.max(0, speedNow - 1.4);
      const streakTargetOpacity = Math.min(0.85, streakDrive / 6.5);
      streakMaterial.opacity = THREE.MathUtils.lerp(streakMaterial.opacity, streakTargetOpacity, 0.08);
      if (streakMaterial.opacity > 0.004) {
        const posArr = streakGeometry.attributes.position.array;
        const advance = streakDrive * 46;
        const tailLength = 50 + streakDrive * 95;
        for (let i = 0; i < streakCount; i++) {
          const si = i * 3;
          streakState[si + 2] += advance;
          if (streakState[si + 2] > 40) spawnStreak(i, true);
          const radius = streakState[si];
          const angle = streakState[si + 1];
          const headZ = streakState[si + 2];
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const pi = i * 6;
          posArr[pi] = x; posArr[pi + 1] = y; posArr[pi + 2] = headZ;
          posArr[pi + 3] = x; posArr[pi + 4] = y; posArr[pi + 5] = headZ - tailLength;
        }
        streakGeometry.attributes.position.needsUpdate = true;
      }

      // Hover raycast — only worth the cost when something is clickable.
      if (interactiveRef.current && onSelectRef.current) {
        raycaster.setFromCamera(ndcMouse, camera);
        const hits = raycaster.intersectObjects(raycastTargets, false);
        const nextHover = hits.length > 0 ? hits[0].object.userData.planetId : null;
        hoveredId = nextHover;

        if (hoveredId && hoveredId !== targetId) {
          const hoveredGroup = planetMeshes.find((g) => g.userData.id === hoveredId);
          if (hoveredGroup) {
            hoveredGroup.getWorldPosition(labelProject);
            labelProject.y += hoveredGroup.userData.size * 1.6;
            labelProject.project(camera);
            const sx = (labelProject.x * 0.5 + 0.5) * window.innerWidth;
            const sy = (-labelProject.y * 0.5 + 0.5) * window.innerHeight;
            if (labelProject.z < 1) {
              label.textContent = `${hoveredGroup.userData.id.replace(/ (Core|Engine|Array|Subsystem|Defense|Matrix).*/, "")} // EXPLORE`;
              label.style.transform = `translate(${sx - label.offsetWidth / 2}px, ${sy}px)`;
              label.style.opacity = "1";
            } else {
              label.style.opacity = "0";
            }
          }
        } else {
          label.style.opacity = "0";
        }
      }

      mousePointer.current.x += (mousePointer.current.targetX - mousePointer.current.x) * 0.04;
      mousePointer.current.y += (mousePointer.current.targetY - mousePointer.current.y) * 0.04;

      if (focalGroup && interactiveRef.current) {
        focalGroup.getWorldPosition(worldGlobalPos);
        const zoom = Math.max(focusOrbit.minZoom, focusOrbit.zoom);
        const offsetX = Math.sin(focusOrbit.azimuth) * Math.cos(focusOrbit.polar) * zoom;
        const offsetY = Math.sin(focusOrbit.polar) * zoom + focalGroup.userData.size * 0.6;
        const offsetZ = Math.cos(focusOrbit.azimuth) * Math.cos(focusOrbit.polar) * zoom;
        cameraTargetPos.set(worldGlobalPos.x + offsetX, worldGlobalPos.y + offsetY, worldGlobalPos.z + offsetZ);
        lookTargetPos.lerp(worldGlobalPos, 0.08);
      } else {
        if (!isDragging) {
          dragVelocity.azimuth *= 0.94;
          dragVelocity.polar *= 0.94;
          cameraRotation.azimuth -= dragVelocity.azimuth;
          cameraRotation.polar *= 0.94;
        }

        const currentProgress = scrollRef.current;
        const normalizedProgress = Math.min(4, currentProgress) / 4;

        // Sample exact CatmullRom coordinates directly from our flight splines
        const splinePosition = cinematicSplinePath.getPointAt(normalizedProgress);

        const currentZoomScale = zoomDist * (1 - normalizedProgress * 0.65);
        const dragOffsetX = Math.sin(cameraRotation.azimuth) * currentZoomScale + mousePointer.current.x * 0.1;
        const dragOffsetY = Math.sin(cameraRotation.polar) * currentZoomScale + mousePointer.current.y * 0.1;
        const dragOffsetZ = Math.cos(cameraRotation.azimuth) * currentZoomScale;

        cameraTargetPos.set(
          splinePosition.x + dragOffsetX,
          splinePosition.y + dragOffsetY,
          splinePosition.z + dragOffsetZ
        );

        const lookTargetX = THREE.MathUtils.lerp(0, solarArmX, Math.min(1, currentProgress / 1.5));
        const lookTargetY = THREE.MathUtils.lerp(0, 0, Math.min(1, currentProgress / 1.5));
        const lookTargetZ = THREE.MathUtils.lerp(0, solarArmZ, Math.min(1, currentProgress / 1.5));

        const taskPush = Math.max(0, currentProgress - 1.5) * 45;
        lookTargetPos.set(lookTargetX, lookTargetY, lookTargetZ - taskPush);
      }

      // A travel sequence damps in slower (0.022 vs 0.06) so the approach
      // plays out over a couple of real seconds instead of snapping shut.
      const focusLerp = landingSequenceRef.current ? 0.022 : 0.06;
      camera.position.lerp(cameraTargetPos, focalGroup ? focusLerp : 0.035);
      camera.lookAt(lookTargetPos);

      // Spin cosmic systems
      milkyWayMesh.rotation.y += 0.00003 * speedNow + (scrollRef.current * 0.00004);
      solarSystemGroup.rotation.y += 0.0001;

      // Render via post-processing bloom composer pass to activate the glow vectors
      composer.render();
    };
    tick();

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("wheel", onGlobalWheelTrack);
      if (currentMount.contains(renderer.domElement)) currentMount.removeChild(renderer.domElement);
      if (currentMount.contains(label)) currentMount.removeChild(label);
      renderer.dispose();
      composer.dispose();
      sphereGeo.dispose();
      moonGeo.dispose();
      galaxyGeometry.dispose();
      streakGeometry.dispose();
    };
    // Mount-only: speed/interactive are read live from refs above (see the
    // sync effects) so a warp-speed pulse or an interactivity flip never
    // rebuilds the scene — only unmounting the viewport does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0 block w-full h-full pointer-events-auto" />;
}
