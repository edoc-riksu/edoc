"use client";
import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function RateLimitButton({ submitting, submittingText, retryAfter, children }) {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!retryAfter) return undefined;
    setCountdown(retryAfter);
    const interval = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const limited = countdown > 0;
  const disabled = submitting || limited;

  return (
    <button type="submit" className="gx-auth-btn" disabled={disabled} aria-disabled={disabled}>
      {submitting && <Loader2 size={16} className="gx-auth-spin" aria-hidden="true" />}
      <span aria-live="polite">
        {limited ? `Too many attempts. Try again in ${countdown}s.` : submitting ? submittingText : children}
      </span>
    </button>
  );
}
