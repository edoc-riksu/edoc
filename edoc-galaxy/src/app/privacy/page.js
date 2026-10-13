import React from "react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="gx-auth">
      <div className="gx-auth-panel">
        <p className="gx-auth-brand">edoc</p>
        <h1 className="gx-auth-title">Privacy Policy</h1>
        <p className="gx-auth-sub">Placeholder page — the real Privacy Policy text goes here.</p>
        <p className="gx-auth-foot">
          <Link href="/signup">Back to sign up</Link>
        </p>
      </div>
    </div>
  );
}
