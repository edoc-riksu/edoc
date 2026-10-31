"use client";
import React, { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import * as authService from "../../lib/authService";
import { useAuth, AuthProvider } from "../../context/AuthContext";
import { isValidCallsign, isValidEmail, isValidPassword, AUTH_MESSAGES } from "../../lib/authValidation";
import TextField from "../../components/auth/TextField";
import PasswordField from "../../components/auth/PasswordField";
import StrengthMeter from "../../components/auth/StrengthMeter";
import ErrorSummary from "../../components/auth/ErrorSummary";
import RateLimitButton from "../../components/auth/RateLimitButton";
import NetworkBanner from "../../components/auth/NetworkBanner";

const FIELD_IDS = {
  callsign: "signup-callsign",
  email: "signup-email",
  password: "signup-password",
  confirmPassword: "signup-confirm-password",
  acceptedTerms: "signup-terms"
};
const EMPTY_ERRORS = { callsign: "", email: "", password: "", confirmPassword: "", acceptedTerms: "" };

function safeReturnTo(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();

  const [values, setValues] = useState({ callsign: "", email: "", password: "", confirmPassword: "", acceptedTerms: false });
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [submitted, setSubmitted] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const [serverError, setServerError] = useState(false);
  const callsignCheckTimer = useRef(null);

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (field !== "callsign") setSuggestions([]);
  };

  const validateField = (field, value, allValues = values) => {
    switch (field) {
      case "callsign":
        return isValidCallsign(value) ? "" : AUTH_MESSAGES.callsign;
      case "email":
        return isValidEmail(value) ? "" : AUTH_MESSAGES.email;
      case "password":
        return isValidPassword(value) ? "" : AUTH_MESSAGES.password;
      case "confirmPassword":
        return value && value === allValues.password ? "" : AUTH_MESSAGES.confirmPassword;
      case "acceptedTerms":
        return value ? "" : AUTH_MESSAGES.acceptedTerms;
      default:
        return "";
    }
  };

  const runCallsignAvailabilityCheck = (callsign) => {
    clearTimeout(callsignCheckTimer.current);
    if (!isValidCallsign(callsign)) return;
    callsignCheckTimer.current = setTimeout(async () => {
      const result = await authService.checkCallsignAvailable(callsign);
      if (result.ok && result.data && result.data.available === false) {
        setErrors((e) => ({ ...e, callsign: AUTH_MESSAGES.callsignTaken }));
        setSuggestions(result.data.suggestions || []);
      }
    }, 400);
  };

  const handleBlur = (field) => () => {
    const message = validateField(field, values[field]);
    setErrors((e) => ({ ...e, [field]: message }));
    if (field === "callsign" && !message) runCallsignAvailabilityCheck(values.callsign);
  };

  const focusField = (field) => document.getElementById(FIELD_IDS[field])?.focus();

  const applySuggestion = (s) => {
    setValues((v) => ({ ...v, callsign: s }));
    setErrors((e) => ({ ...e, callsign: "" }));
    setSuggestions([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitted(true);
    const nextErrors = {
      callsign: validateField("callsign", values.callsign),
      email: validateField("email", values.email),
      password: validateField("password", values.password),
      confirmPassword: validateField("confirmPassword", values.confirmPassword),
      acceptedTerms: validateField("acceptedTerms", values.acceptedTerms)
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    setNetworkError(false);
    setServerError(false);
    setRetryAfter(0);

    const result = await authService.signup({ callsign: values.callsign, email: values.email, password: values.password });
    setSubmitting(false);

    if (result.networkError) {
      setNetworkError(true);
      return;
    }
    if (result.ok) {
      setUser(result.data.user);
      // New pilots pick an explorer/suit once before their first galaxy
      // view — Hangar itself carries the original destination forward.
      const dest = safeReturnTo(searchParams.get("returnTo"), "/");
      router.push(`/hangar?onboarding=1&returnTo=${encodeURIComponent(dest)}`);
      return;
    }
    if (result.status === 409) {
      if (result.data?.code === "callsign_taken") {
        setErrors((e) => ({ ...e, callsign: AUTH_MESSAGES.callsignTaken }));
        setSuggestions(result.data.suggestions || []);
      } else if (result.data?.code === "email_taken") {
        setErrors((e) => ({ ...e, email: "That email is already linked to an account." }));
      }
      return;
    }
    if (result.status === 422 && result.data?.fields) {
      setErrors((e) => ({ ...e, ...result.data.fields }));
      return;
    }
    if (result.status === 429) {
      setRetryAfter(result.data?.retryAfter || 30);
      return;
    }
    // Any other status (500s, etc.) — surface it instead of silently
    // doing nothing, which is what used to happen here.
    setServerError(true);
  };

  const retry = () => handleSubmit({ preventDefault() {} });

  return (
    <div className="gx-auth-panel">
      <p className="gx-auth-brand">edoc</p>
      <h1 className="gx-auth-title">Your ship is ready, pilot</h1>
      <p className="gx-auth-sub">Create an account to start your journey.</p>

      {networkError && <NetworkBanner onRetry={retry} />}
      {serverError && (
        <div role="alert" className="gx-auth-banner">
          <span>Something went wrong creating your account. Please try again.</span>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="gx-auth-form">
        {submitted && <ErrorSummary errors={errors} onFocusField={focusField} completionText="create your pilot" />}

        <div className="gx-auth-field">
          <TextField
            id={FIELD_IDS.callsign}
            label="Pilot callsign"
            helperText="Shown on your profile. You can change it later."
            value={values.callsign}
            onChange={(e) => setField("callsign", e.target.value)}
            onBlur={handleBlur("callsign")}
            error={errors.callsign}
            autoComplete="username"
            required
          />
          {suggestions.length > 0 && (
            <div className="gx-auth-chips" role="group" aria-label="Available callsign suggestions">
              {suggestions.slice(0, 2).map((s) => (
                <button key={s} type="button" className="gx-auth-chip" onClick={() => applySuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <TextField
          id={FIELD_IDS.email}
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          onBlur={handleBlur("email")}
          error={errors.email}
          autoComplete="email"
          required
        />

        <div>
          <PasswordField
            id={FIELD_IDS.password}
            label="Password"
            value={values.password}
            onChange={(e) => setField("password", e.target.value)}
            onBlur={handleBlur("password")}
            error={errors.password}
            autoComplete="new-password"
          />
          <StrengthMeter password={values.password} />
        </div>

        <PasswordField
          id={FIELD_IDS.confirmPassword}
          label="Confirm password"
          value={values.confirmPassword}
          onChange={(e) => setField("confirmPassword", e.target.value)}
          onBlur={handleBlur("confirmPassword")}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <label htmlFor={FIELD_IDS.acceptedTerms} className="gx-auth-checkbox">
          <input
            id={FIELD_IDS.acceptedTerms}
            type="checkbox"
            checked={values.acceptedTerms}
            onChange={(e) => setField("acceptedTerms", e.target.checked)}
            onBlur={handleBlur("acceptedTerms")}
            aria-invalid={errors.acceptedTerms ? "true" : undefined}
            aria-describedby={errors.acceptedTerms ? `${FIELD_IDS.acceptedTerms}-error` : undefined}
          />
          <span>
            I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>
          </span>
        </label>
        {errors.acceptedTerms && (
          <p id={`${FIELD_IDS.acceptedTerms}-error`} role="alert" className="gx-auth-error">
            {errors.acceptedTerms}
          </p>
        )}

        <RateLimitButton submitting={submitting} submittingText="Creating account…" retryAfter={retryAfter}>
          Create account
        </RateLimitButton>
      </form>

      <p className="gx-auth-foot">
        Already flying? <Link href="/signin">Sign in</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <AuthProvider>
      <div className="gx-auth">
        <Suspense fallback={null}>
          <SignupForm />
        </Suspense>
      </div>
    </AuthProvider>
  );
}
