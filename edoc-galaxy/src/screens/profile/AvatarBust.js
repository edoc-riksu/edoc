"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import ExplorerPortrait from "../hangar/ExplorerPortrait";

// Same podium models hangarBayScene.js uses - see public/art/ORIGIN.md.
const AVATAR_MODEL = {
  vega: "/art/hangar/models/avatar-male.glb",
  kael: "/art/hangar/models/avatar-kael.glb",
  taro: "/art/hangar/models/avatar-taro.glb",
  mira: "/art/hangar/models/avatar-female.glb"
};

/**
 * A live, head-to-toe render of the player's own 3D avatar model, framed
 * from its own full bounding box so it works regardless of each model's
 * exact proportions. No background/border of its own - just the figure -
 * so it sits directly on whatever page it's dropped onto. The flat
 * full-body ExplorerPortrait is kept underneath as a fallback while the
 * model loads, then explicitly faded out once it's ready.
 */
export default function AvatarBust({ explorer, width = 130, height = 240 }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    setReady(false);
    const url = AVATAR_MODEL[explorer] || AVATAR_MODEL.vega;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let frame;
    let model = null;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0x8fb8ff, 0x0b0f17, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(1.2, 2, 2.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5eead4, 0.9);
    rim.position.set(-1.5, 1.2, -1.8);
    scene.add(rim);

    new GLTFLoader().load(
      url,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const top = box.max.y;
        const bottom = box.min.y;
        const center = new THREE.Vector3((box.min.x + box.max.x) / 2, (top + bottom) / 2, (box.min.z + box.max.z) / 2);

        const vFov = (camera.fov * Math.PI) / 180;
        const distance = ((top - bottom) / 2 / Math.tan(vFov / 2)) * 1.12;

        camera.position.set(center.x, center.y, center.z + distance);
        camera.lookAt(center);

        renderer.render(scene, camera);
        setReady(true);
      },
      undefined,
      () => {}
    );

    function animate() {
      frame = requestAnimationFrame(animate);
      if (model) model.rotation.y = Math.sin(Date.now() * 0.0004) * 0.25;
      renderer.render(scene, camera);
    }
    if (!reduceMotion) animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach((m) => {
          for (const k in m) {
            if (m[k] && m[k].isTexture) m[k].dispose();
          }
          m.dispose();
        });
      });
      renderer.dispose();
    };
  }, [explorer, width, height]);

  return (
    <span className="avatar-bust" style={{ width, height }}>
      <span className="avatar-bust-fallback" data-ready={ready} aria-hidden="true">
        <ExplorerPortrait explorer={explorer} variant="full" width={width} height={height} />
      </span>
      <canvas ref={canvasRef} className="avatar-bust-canvas" width={width} height={height} aria-hidden="true" />
    </span>
  );
}
