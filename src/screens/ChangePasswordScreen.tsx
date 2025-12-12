// src/screens/ChangePasswordScreen.tsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

type ChangePasswordScreenProps = {
  onBack: () => void;
  onPasswordChanged?: () => void;
};

export default function ChangePasswordScreen({
  onBack,
  onPasswordChanged,
}: ChangePasswordScreenProps) {
  const { user } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleChangePassword() {
    setError("");
    setSuccess("");

    if (!user?.email) {
      setError("You must be logged in to change your password.");
      return;
    }

    if (!oldPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setSubmitting(true);

    // 1️⃣ Re-authenticate with old password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInError) {
      setSubmitting(false);
      setError("Your current password is incorrect.");
      return;
    }

    // 2️⃣ Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message || "Unable to update password right now.");
      return;
    }

    setSuccess("Your password has been updated.");

    if (onPasswordChanged) onPasswordChanged();
  }

  return (
    <div className="cc-auth-outer">
      <div className="cc-auth-wrapper">
        <section className="cc-main-card cc-login-card">
          <div className="cc-login-grid">
            <div className="cc-login-col cc-login-col--left">
              <h2 className="cc-login-title">Change your password</h2>
              <p className="cc-login-desc">
                For security, please confirm your current password before updating.
              </p>

              {/* CURRENT PASSWORD */}
              <label className="cc-label">Current password</label>
              <input
                type="password"
                className="cc-login-input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />

              {/* NEW PASSWORD */}
              <label className="cc-label">New password</label>
              <input
                type="password"
                className="cc-login-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              {/* CONFIRM */}
              <label className="cc-label">Confirm new password</label>
              <input
                type="password"
                className="cc-login-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {error && <div className="cc-login-error">{error}</div>}
              {success && (
                <div className="cc-success-message cc-success-message--inline">
                  {success}
                </div>
              )}

              {/* NEW BUTTONS — BLUE + YELLOW */}
             <div className="cc-change-password-button-row">
  <button
    type="button"
    onClick={handleChangePassword}
    className="cc-cta cc-cta--border cc-cta--blue"
    disabled={submitting}
  >
    {submitting ? "Updating…" : "Update password"}
  </button>

  <button
    type="button"
    onClick={onBack}
    className="cc-cta cc-cta--border cc-cta--yellow"
  >
    Back to account
  </button>
</div>

            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
