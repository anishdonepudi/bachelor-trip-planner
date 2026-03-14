"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { TripCreationWizard } from "@/components/TripCreationWizard";
import { useState } from "react";

export default function NewTripPage() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-1)] flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-base font-heading font-semibold mb-1">Sign in to create a trip</h2>
          <p className="text-sm text-[var(--text-2)] mb-4">You need an account to create and manage trips.</p>
          <button
            onClick={() => setShowAuth(true)}
            className="w-full h-11 rounded-md text-sm font-semibold bg-[var(--blue)] text-white hover:brightness-110 transition-all duration-150"
          >
            Sign In / Sign Up
          </button>
          <a href="/" className="inline-block mt-3 text-sm text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
            Back to home
          </a>
          <AuthModal open={showAuth} onOpenChange={setShowAuth} />
        </div>
      </div>
    );
  }

  return <TripCreationWizard />;
}
