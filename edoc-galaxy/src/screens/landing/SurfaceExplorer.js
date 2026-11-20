"use client";

import { useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { modelsFor } from "../result/suitModels";
import { explorerSpot } from "./explorerSpot";

/**
 * The pilot's own explorer, wearing the suit they equipped in the hangar, standing on the surface next to the ship.
 *
 * It reads the explorer and suit from the signed-in pilot (the same two fields the hangar saves); with nobody signed in it draws
 * nothing, so the surface looks exactly as it did before. The figure is the hangar's own 3D model (see public/art/ORIGIN.md),
 * on a clear canvas, with a soft shadow on the ground. `calm` (reduced motion) shows it standing still.
 */
function Figure({ calm }) {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [box, setBox] = useState(null);
  const [ready, setReady] = useState(false);
  const explorer = user?.explorer;
  const suit = user?.suit;
  const signedIn = !!user;

  useEffect(() => {
    const place = () => setBox(explorerSpot(window.innerWidth, window.innerHeight));
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  const width = box?.width;
  const height = box?.height;
  const toward = box?.toward ?? 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!signedIn || !canvas || !width) return undefined;
    setReady(false);
    let disposed = false;
    let frame = 0;
    let cleanup = () => {};

    (async () => {
      try {
        const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/environments/RoomEnvironment.js")
        ]);
        if (disposed) return;
        const { base, starfarer } = modelsFor(explorer);
        const url = suit === "starfarer" ? starfarer : base;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(26, width / height, 0.1, 30);
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
        // dusk on the surface: a cool sky light, a warm low sun from the right, a teal rim from the crystals
        scene.add(new THREE.HemisphereLight(0x8fb8ff, 0x1a2418, 0.8));
        const sun = new THREE.DirectionalLight(0xffe2b0, 1.4);
        sun.position.set(1.8, 1.2, 1.6);
        scene.add(sun);
        const rim = new THREE.DirectionalLight(0x5eead4, 0.8);
        rim.position.set(-1.6, 1.0, -1.6);
        scene.add(rim);

        let model = null;
        let alive = true;
        cleanup = () => {
          alive = false;
          cancelAnimationFrame(frame);
          scene.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
            mats.forEach((m) => {
              for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose();
              m.dispose();
            });
          });
          renderer.dispose();
        };

        new GLTFLoader().load(
          url,
          (gltf) => {
            if (disposed || !alive) return;
            model = gltf.scene;
            scene.add(model);
            const bb = new THREE.Box3().setFromObject(model);
            const mid = new THREE.Vector3((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2);
            const dist = ((bb.max.y - bb.min.y) / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.04;
            camera.position.set(mid.x, mid.y, mid.z + dist);
            camera.lookAt(mid);
            model.rotation.y = toward;
            renderer.render(scene, camera);
            setReady(true);
            if (!calm) {
              const tick = () => {
                frame = requestAnimationFrame(tick);
                model.rotation.y = toward + Math.sin(Date.now() * 0.0006) * 0.12;
                renderer.render(scene, camera);
              };
              tick();
            }
          },
          undefined,
          () => {}
        );
      } catch {
        /* no WebGL: the surface simply has no figure */
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [signedIn, explorer, suit, width, height, toward, calm]);

  if (!signedIn || !box) return null;
  return (
    <div className={`sf-explorer ${ready ? "is-ready" : ""} ${calm ? "sf-explorer--calm" : ""}`} style={{ left: box.left, top: box.top, width: box.width, height: box.height }} aria-hidden="true">
      <span className="sf-explorer-shadow" />
      <canvas ref={canvasRef} className="sf-explorer-canvas" width={box.width} height={box.height} />
    </div>
  );
}

/** Wraps itself in AuthProvider, the same way the other screens do, so the surface page needs no change besides placing it. */
export default function SurfaceExplorer({ calm = false }) {
  return (
    <AuthProvider>
      <Figure calm={calm} />
    </AuthProvider>
  );
}
