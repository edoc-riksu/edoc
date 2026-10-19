"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A draggable split between two flex children sharing one container.
 * `axis` "x" drags left/right (side-by-side panes), "y" drags up/down
 * (stacked panes). Returns the first pane's size as a percentage of the
 * container, a ref to put on the container, and props for a handle
 * element placed between the two panes (pointer-drag and arrow-key
 * resize, so it stays usable from the keyboard).
 */
export default function useResizable({ axis = "x", initial = 50, min = 20, max = 80 } = {}) {
  const [pct, setPct] = useState(initial);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const onPointerDown = useCallback((e) => {
    dragging.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const raw = axis === "x" ? ((e.clientX - rect.left) / rect.width) * 100 : ((e.clientY - rect.top) / rect.height) * 100;
      setPct(Math.min(max, Math.max(min, raw)));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [axis, min, max]);

  const onKeyDown = useCallback(
    (e) => {
      const step = 2;
      const grow = axis === "x" ? "ArrowRight" : "ArrowDown";
      const shrink = axis === "x" ? "ArrowLeft" : "ArrowUp";
      if (e.key === grow) setPct((p) => Math.min(max, p + step));
      else if (e.key === shrink) setPct((p) => Math.max(min, p - step));
      else return;
      e.preventDefault();
    },
    [axis, min, max]
  );

  return {
    pct,
    containerRef,
    handleProps: {
      onPointerDown,
      onKeyDown,
      role: "separator",
      "aria-orientation": axis === "x" ? "vertical" : "horizontal",
      tabIndex: 0
    }
  };
}
