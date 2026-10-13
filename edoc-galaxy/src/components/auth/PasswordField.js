"use client";
import React, { forwardRef, useId, useState } from "react";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";

const PasswordField = forwardRef(function PasswordField(
  { label, id: idProp, error, helperText, autoComplete, value, onChange, onBlur, required = true },
  ref
) {
  const [visible, setVisible] = useState(false);
  const reactId = useId();
  const id = idProp || reactId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy = [helperText ? helperId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="gx-auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="gx-auth-input-row">
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className="gx-auth-input"
        />
        <button
          type="button"
          className="gx-auth-eye"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
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
});

export default PasswordField;
