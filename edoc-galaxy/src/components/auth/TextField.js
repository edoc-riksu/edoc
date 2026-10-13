"use client";
import React, { useId } from "react";
import { AlertTriangle } from "lucide-react";

export default function TextField({ label, id: idProp, error, helperText, ...inputProps }) {
  const reactId = useId();
  const id = idProp || reactId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy = [helperText ? helperId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="gx-auth-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className="gx-auth-input"
        {...inputProps}
      />
      {!error && helperText && (
        <p id={helperId} className="gx-auth-helper">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="gx-auth-error">
          <AlertTriangle size={13} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
