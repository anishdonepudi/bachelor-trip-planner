"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./auth/AuthProvider";
import { AuthModal } from "./auth/AuthModal";

interface TripSummary {
  id: string;
  name: string;
  destination_city: string | null;
  destination_airport: string;
  cities: { city: string; people: number }[];
  total_people: number;
  created_at: string;
  updated_at: string;
}

export function LandingPage() {
  const { user, loading, signOut } = useAuth();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [joinId, setJoinId] = useState("");

  useEffect(() => {
    if (!user) {
      setTrips([]);
      return;
    }
    setTripsLoading(true);
    fetch("/api/trips")
      .then((r) => r.json())
      .then((d) => setTrips(d.trips ?? []))
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false));
  }, [user]);

  const openAuth = (tab: "signin" | "signup") => {
    setAuthTab(tab);
    setShowAuth(true);
  };

  const handleJoin = () => {
    if (!joinId.trim()) return;
    // Extract trip ID from URL or use raw input
    const match = joinId.match(/\/trip\/([a-zA-Z0-9_-]+)/);
    const id = match ? match[1] : joinId.trim();
    window.location.href = `/trip/${id}`;
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-1)]">
      {/* Header */}
      <header className="glass border-b border-[var(--border-default)] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <h1 className="text-sm font-heading font-bold tracking-tight">TripSync</h1>
          <div className="flex items-center gap-2">
            <a
              href="/dashboard"
              className="h-7 px-1.5 rounded text-[10px] font-mono text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
            >
              Dev
            </a>
            {loading ? null : user ? (
              <>
                <span className="text-[11px] text-[var(--text-3)] font-mono hidden sm:inline">{user.email}</span>
                <button
                  onClick={signOut}
                  className="h-7 px-2.5 rounded-md text-xs font-medium bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-all duration-150"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => openAuth("signin")}
                  className="h-7 px-2.5 rounded-md text-xs font-medium bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-all duration-150"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="h-7 px-2.5 rounded-md text-xs font-medium bg-[var(--blue)] text-white hover:brightness-110 transition-all duration-150"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Hero */}
        <section className="text-center py-8">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight mb-3">
            Plan the perfect group trip
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-2)] max-w-md mx-auto mb-6">
            Compare flights, stays, and costs across cities and weekends. Find the cheapest dates for everyone.
          </p>
          <a
            href="/trip/new"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-md text-sm font-semibold bg-[var(--blue)] text-white hover:brightness-110 transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Plan a New Trip
          </a>
        </section>

        {/* My Trips */}
        {user && (
          <section>
            <h3 className="text-base font-heading font-semibold mb-3">My Trips</h3>
            {tripsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)] animate-pulse" />
                ))}
              </div>
            ) : trips.length === 0 ? (
              <div className="p-6 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)] text-center">
                <p className="text-sm text-[var(--text-2)]">No trips yet. Create your first one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trips.map((trip) => (
                  <a
                    key={trip.id}
                    href={`/trip/${trip.id}`}
                    className="block p-4 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)] transition-all duration-150 group"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <h4 className="text-sm font-heading font-semibold text-[var(--text-1)] group-hover:text-[var(--blue)] transition-colors">
                        {trip.name}
                      </h4>
                      <svg className="w-4 h-4 text-[var(--text-3)] group-hover:text-[var(--blue)] transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="text-[11px] text-[var(--text-3)] font-mono">
                      {trip.destination_city || trip.destination_airport}
                      {" \u00b7 "}
                      {trip.cities?.filter((c: { city: string }) => c.city).length ?? 0} cities
                      {" \u00b7 "}
                      {trip.total_people} people
                    </p>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Join a Trip */}
        <section>
          <h3 className="text-base font-heading font-semibold mb-3">Join a Trip</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="flex-1 h-10 px-3 rounded-md text-sm bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] focus:outline-none focus:border-[var(--border-active)] transition-all duration-150 placeholder:text-[var(--text-3)]"
              placeholder="Paste trip URL or ID..."
            />
            <button
              onClick={handleJoin}
              disabled={!joinId.trim()}
              className="h-10 px-4 rounded-md text-sm font-medium bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-1)] hover:bg-[var(--surface-3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              Go
            </button>
          </div>
        </section>

        {/* Feature highlights */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                title: "Multi-city flights",
                desc: "Compare prices from every origin city in your group, across all weekends in your travel window.",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                ),
              },
              {
                title: "Airbnb pricing",
                desc: "Automatically find and compare Airbnb stays at your destination, matched to each weekend.",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                ),
              },
              {
                title: "Smart ranking",
                desc: "Five scoring algorithms to find the best weekend for your group, from cheapest to fairest.",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
              },
            ].map(({ title, desc, icon }) => (
              <div
                key={title}
                className="p-4 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)]"
              >
                <div className="w-9 h-9 rounded-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] mb-3">
                  {icon}
                </div>
                <h4 className="text-sm font-heading font-semibold mb-1">{title}</h4>
                <p className="text-[11px] text-[var(--text-2)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <AuthModal open={showAuth} onOpenChange={setShowAuth} defaultTab={authTab} />
    </div>
  );
}
