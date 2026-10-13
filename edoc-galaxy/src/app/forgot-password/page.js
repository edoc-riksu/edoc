"use client";
import React, { useState } from "react";
import Link from "next/link";
import TextField from "../../components/auth/TextField";

// Static UI only — there's no email-sending infrastructure in this app
// (or anywhere in the project) yet.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <div className="gx-auth">
      <div className="gx-auth-panel">
        <p className="gx-auth-brand">edoc</p>
        <h1 className="gx-auth-title">Reset your password</h1>
        <p className="gx-auth-sub">
          {submitted ? "Check your email for a reset link." : "Enter your email and we'll send you a link to reset your password."}
        </p>

        {submitted ? (
          <div>
            <p className="gx-auth-sub">
              If an account exists for <strong style={{ color: "var(--ink)" }}>{email}</strong>, a reset link is on its way.
            </p>
            <p className="gx-auth-helper">
              Preview only — no email is actually sent yet. <Link href="/reset-password">See the reset screen →</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="gx-auth-form">
            <TextField
              id="forgot-password-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <button type="submit" className="gx-auth-btn">
              Send reset link
            </button>
          </form>
        )}

        <p className="gx-auth-foot">
          <Link href="/signin">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
