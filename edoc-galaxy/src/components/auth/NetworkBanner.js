"use client";
import React from "react";
import { WifiOff } from "lucide-react";

export default function NetworkBanner({ onRetry }) {
  return (
    <div role="alert" className="gx-auth-banner">
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <WifiOff size={14} aria-hidden="true" />
        Can&apos;t reach the server. Check your connection and try again.
      </span>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
