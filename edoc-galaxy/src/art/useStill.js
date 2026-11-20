"use client";

import { useEffect, useState } from "react";

/**
 * True when a scene should hold still: its own `calm` prop is on, or the system asks for reduced motion.
 * The scenes that take a `calm` prop use this, so the system setting works even when the screen showing them forgets to pass it.
 */
export default function useStill(calm = false) {
  const [os, setOs] = useState(false);
  useEffect(() => {
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (!mq) return undefined;
    const on = () => setOs(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return !!calm || os;
}
