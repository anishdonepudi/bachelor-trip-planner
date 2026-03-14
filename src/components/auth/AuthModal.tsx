"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Tab = "signin" | "signup";

interface AuthModalProps {
  trigger?: React.ReactNode;
  defaultTab?: Tab;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AuthModal({ trigger, defaultTab = "signin", open: controlledOpen, onOpenChange }: AuthModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const reset = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) reset();
    setOpen(isOpen);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setSuccess("Check your email for a confirmation link!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full h-10 px-3 rounded-md text-sm bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] focus:outline-none focus:border-[var(--border-active)] transition-all duration-150 placeholder:text-[var(--text-3)]";

  const content = (
    <>
      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)] mb-4">
        {(["signin", "signup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); setSuccess(null); }}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all duration-150 ${
              tab === t
                ? "bg-[var(--blue)] text-white shadow-sm"
                : "text-[var(--text-2)] hover:text-[var(--text-1)]"
            }`}
          >
            {t === "signin" ? "Sign In" : "Sign Up"}
          </button>
        ))}
      </div>

      {success ? (
        <div className="p-3 rounded-md bg-[var(--green-soft)] border border-[var(--green-border)] text-sm text-[var(--green)]">
          {success}
        </div>
      ) : (
        <form onSubmit={tab === "signin" ? handleSignIn : handleSignUp} className="space-y-3">
          <div>
            <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
              required
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
            />
          </div>
          {tab === "signup" && (
            <div>
              <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-md bg-[var(--red-soft)] border border-[var(--red-border)] text-xs text-[var(--red)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-md text-sm font-semibold bg-[var(--blue)] text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {tab === "signin" ? "Signing in..." : "Creating account..."}
              </span>
            ) : tab === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent
        className="bg-[var(--surface-0)] border-[var(--border-hover)] text-[var(--text-1)] max-w-sm rounded-lg"
        initialFocus={false}
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[var(--text-1)] text-base font-heading font-semibold">
              {tab === "signin" ? "Welcome Back" : "Create Account"}
            </DialogTitle>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
