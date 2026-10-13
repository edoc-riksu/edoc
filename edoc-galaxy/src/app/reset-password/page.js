"use client";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PasswordField from "../../components/auth/PasswordField";
import StrengthMeter from "../../components/auth/StrengthMeter";
import { AUTH_MESSAGES } from "../../lib/authValidation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError(AUTH_MESSAGES.confirmPassword);
      return;
    }
    setError("");
    setDone(true);
  };

  if (done) {
    return (
      <div>
        <p className="gx-auth-sub">Your password has been updated.</p>
        <p className="gx-auth-helper">Preview only — nothing was actually changed on an account yet.</p>
        <p className="gx-auth-foot">
          <Link href="/signin">Continue to sign in →</Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="gx-auth-form">
      {!token && <p className="gx-auth-helper">No reset token in this link — you&apos;re viewing this as a standalone preview.</p>}
      <div>
        <PasswordField id="reset-password" label="New password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <StrengthMeter password={password} />
      </div>
      <PasswordField
        id="reset-confirm-password"
        label="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={error}
        autoComplete="new-password"
      />
      <button type="submit" className="gx-auth-btn">
        Update password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="gx-auth">
      <div className="gx-auth-panel">
        <p className="gx-auth-brand">edoc</p>
        <h1 className="gx-auth-title">Choose a new password</h1>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
