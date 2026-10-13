"use client";
import React, { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import * as authService from "../../lib/authService";
import { useAuth, AuthProvider } from "../../context/AuthContext";
import { isValidEmail, AUTH_MESSAGES } from "../../lib/authValidation";
import TextField from "../../components/auth/TextField";
import PasswordField from "../../components/auth/PasswordField";
import RateLimitButton from "../../components/auth/RateLimitButton";
import NetworkBanner from "../../components/auth/NetworkBanner";

const FIELD_IDS = { email: "signin-email", password: "signin-password" };

function safeReturnTo(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function SigninForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();

  const [values, setValues] = useState({ email: "", password: "", remember: false });
  const [emailError, setEmailError] = useState("");
  const [credentialsError, setCredentialsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const passwordRef = useRef(null);

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (field === "password") setCredentialsError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextEmailError = isValidEmail(values.email) ? "" : AUTH_MESSAGES.email;
    setEmailError(nextEmailError);
    if (nextEmailError) return;

    setSubmitting(true);
    setNetworkError(false);
    setRetryAfter(0);
    setCredentialsError("");

    const result = await authService.signin({ email: values.email, password: values.password, remember: values.remember });
    setSubmitting(false);

    if (result.networkError) {
      setNetworkError(true);
      return;
    }
    if (result.ok) {
      setUser(result.data.user);
      router.push(safeReturnTo(searchParams.get("returnTo")));
      return;
    }
    if (result.status === 401) {
      setCredentialsError(AUTH_MESSAGES.invalidCredentials);
      setValues((v) => ({ ...v, password: "" }));
      passwordRef.current?.focus();
      return;
    }
    if (result.status === 429) setRetryAfter(result.data?.retryAfter || 30);
  };

  const retry = () => handleSubmit({ preventDefault() {} });

  return (
    <div className="gx-auth-panel">
      <p className="gx-auth-brand">edoc</p>
      <h1 className="gx-auth-title">Welcome back, pilot</h1>
      <p className="gx-auth-sub">Your progress is right where you left it.</p>

      {networkError && <NetworkBanner onRetry={retry} />}

      <form onSubmit={handleSubmit} noValidate className="gx-auth-form">
        <TextField
          id={FIELD_IDS.email}
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          onBlur={() => setEmailError(values.email && !isValidEmail(values.email) ? AUTH_MESSAGES.email : "")}
          error={emailError}
          autoComplete="email"
          required
        />

        <div>
          <PasswordField
            id={FIELD_IDS.password}
            ref={passwordRef}
            label="Password"
            value={values.password}
            onChange={(e) => setField("password", e.target.value)}
            autoComplete="current-password"
          />
          {credentialsError && (
            <p role="alert" className="gx-auth-error">
              {credentialsError}
            </p>
          )}
        </div>

        <div className="gx-auth-row">
          <label htmlFor="signin-remember" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-soft)" }}>
            <input
              id="signin-remember"
              type="checkbox"
              checked={values.remember}
              onChange={(e) => setField("remember", e.target.checked)}
            />
            Keep me signed in
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        <RateLimitButton submitting={submitting} submittingText="Signing in…" retryAfter={retryAfter}>
          Sign in
        </RateLimitButton>
      </form>

      <p className="gx-auth-foot">
        New here? <Link href="/signup">Create an account</Link>
      </p>
    </div>
  );
}

export default function SigninPage() {
  return (
    <AuthProvider>
      <div className="gx-auth">
        <Suspense fallback={null}>
          <SigninForm />
        </Suspense>
      </div>
    </AuthProvider>
  );
}
