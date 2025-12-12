// src/screens/CreateAccountScreen.tsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

type CreateAccountScreenProps = {
  onBack: () => void;
  onAuthSuccess: () => void;
  onGoToLogin: () => void;
};

export default function CreateAccountScreen({
  onBack,
  onAuthSuccess,
  onGoToLogin,
}: CreateAccountScreenProps) {
  const { signUp } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    const signupError = await signUp(email, password, {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    });

    if (signupError) {
      setError(signupError.message || "Unable to create your account.");
    } else {
      onAuthSuccess();
    }
  }

  return (
    <div className="cc-auth-wrapper">
      <div className="cc-auth-content">
        <h2 className="cc-login-title">Create your CruiseCast account</h2>

        <p className="cc-login-desc">
          Creating an account lets you save cruises and quickly re-check their
          weather any time. Your favorite sailings stay just a click away.
        </p>

        <label className="cc-label">First name</label>
        <input
          type="text"
          className="cc-login-input"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <label className="cc-label">Last name</label>
        <input
          type="text"
          className="cc-login-input"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

        <label className="cc-label">Email</label>
        <input
          type="email"
          className="cc-login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="cc-label">Password</label>
        <input
          type="password"
          className="cc-login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label className="cc-label">Confirm password</label>
        <input
          type="password"
          className="cc-login-input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && <div className="cc-login-error">{error}</div>}

        <button
          onClick={handleCreate}
          type="button"
          className="cc-button-primary cc-button-primary--yellow cc-login-submit"
        >
          Create Account
        </button>

        <button
          type="button"
          className="cc-text-link cc-auth-link"
          onClick={onGoToLogin}
        >
          Already have an account? Sign in instead
        </button>
      </div>
    </div>
  );
}
