"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

interface ProfileData {
  firstName: string | null;
  middleInitial: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api/backend${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();

  // Personal info state
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState("");
  const [infoError, setInfoError] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    apiFetch("/users/me")
      .then((data: ProfileData) => {
        setFirstName(data.firstName || "");
        setMiddleInitial(data.middleInitial || "");
        setLastName(data.lastName || "");
        setEmail(data.email);
      })
      .catch(() => {})
      .finally(() => setInfoLoading(false));
  }, []);

  async function handleInfoSave(e: React.FormEvent) {
    e.preventDefault();
    setInfoSaving(true);
    setInfoError("");
    setInfoSuccess("");
    try {
      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify({ firstName, middleInitial: middleInitial || undefined, lastName, email }),
      });
      setInfoSuccess("Profile updated successfully.");
      await updateSession();
    } catch (err: any) {
      setInfoError(err.message || "Failed to save.");
    } finally {
      setInfoSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwSaving(true);
    setPwError("");
    setPwSuccess("");
    try {
      await apiFetch("/users/me/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwSuccess("Password updated. You may need to sign in again on other devices.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwError(err.message || "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await apiFetch("/users/me", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      await signOut({ callbackUrl: "/login" });
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete account.");
      setDeleteLoading(false);
    }
  }

  if (infoLoading) {
    return (
      <div className="text-center py-12 text-gray-500 font-sans">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">
        Profile
      </h1>

      {/* ── Personal Information ─────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-[var(--color-dark-teal)]">
          Personal Information
        </h2>

        <form onSubmit={handleInfoSave} className="space-y-4">
          {infoError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-sans">{infoError}</div>
          )}
          {infoSuccess && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg font-sans">{infoSuccess}</div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans text-sm"
              />
            </div>
            <div className="w-20">
              <label htmlFor="middleInitial" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                M.I.
              </label>
              <input
                id="middleInitial"
                type="text"
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value.slice(0, 1).toUpperCase())}
                maxLength={1}
                placeholder="A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans text-sm text-center"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans text-sm"
            />
          </div>

          <Button type="submit" disabled={infoSaving}>
            {infoSaving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </section>

      {/* ── Change Password ──────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-[var(--color-dark-teal)]">
          Change Password
        </h2>

        <form onSubmit={handlePasswordSave} className="space-y-4">
          {pwError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-sans">{pwError}</div>
          )}
          {pwSuccess && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg font-sans">{pwSuccess}</div>
          )}

          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
              Current Password
            </label>
            <PasswordInput
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
              New Password
            </label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-gray-400 font-sans">
              Min 8 chars, uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
              Confirm New Password
            </label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" disabled={pwSaving}>
            {pwSaving ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </section>

      {/* ── Danger Zone ──────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm p-6 border border-red-100">
        <h2 className="font-display text-lg font-bold text-red-600 mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-gray-500 font-sans mb-4">
          Permanently delete your account and all spending plan data. This cannot be undone.
        </p>
        <Button
          variant="danger"
          onClick={() => { setDeleteError(""); setDeletePassword(""); setShowDeleteModal(true); }}
        >
          Delete Account
        </Button>
      </section>

      {/* ── Delete Confirmation Modal ─────────────────────── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
          onTouchEnd={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Delete Account</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-10 h-10 flex items-center justify-center -mr-2 text-white/70 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <p className="text-sm text-gray-700 font-sans">
                Enter your password to confirm. All your plans, transactions, and data will be permanently deleted.
              </p>
              {deleteError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-sans">{deleteError}</div>
              )}
              <div>
                <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                  Password
                </label>
                <PasswordInput
                  id="deletePassword"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleteLoading || !deletePassword}
              >
                {deleteLoading ? "Deleting..." : "Delete My Account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
