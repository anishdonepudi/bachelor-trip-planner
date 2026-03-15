"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./auth/AuthProvider";
import { AuthModal } from "./auth/AuthModal";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
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

// ────────────────────────────────────────────
// useScrollReveal hook
// ────────────────────────────────────────────
function useScrollReveal() {
  const elements = useRef<Set<Element>>(new Set());
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.current.forEach((el) => observer.current?.observe(el));

    return () => observer.current?.disconnect();
  }, []);

  const ref = useCallback((el: Element | null) => {
    if (!el) return;
    elements.current.add(el);
    observer.current?.observe(el);
  }, []);

  return ref;
}

// ────────────────────────────────────────────
// useParallax hook — offset elements based on scroll
// ────────────────────────────────────────────
function useParallax(speed = 0.3) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const viewCenter = window.innerHeight / 2;
          const offset = (center - viewCenter) * speed;
          ref.current.style.transform = `translateY(${offset}px)`;
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return ref;
}

// ────────────────────────────────────────────
// useCountUp hook — animate numbers on visibility
// ────────────────────────────────────────────
function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setCount(target);
      return;
    }

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, target, duration]);

  return { ref, count };
}

// ────────────────────────────────────────────
// Icon components
// ────────────────────────────────────────────
function PlaneIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function HomeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function ChartIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function UsersIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function SparklesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function BoltIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function GlobeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function CalendarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function CurrencyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrophyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.996.178-1.768.65-2.08 1.275m0 0a1.843 1.843 0 00-.025 1.757c.333.667 1.162 1.175 2.207 1.394M3.17 5.512A6.016 6.016 0 003 6.75m.17-1.238C3.52 4.652 4.4 4.012 5.55 3.632M5.55 3.632A48.772 48.772 0 0112 3c2.226 0 4.39.223 6.45.632m0 0c1.15.38 2.03 1.02 2.38 1.88M18.45 3.632A1.849 1.849 0 0120.83 5.51m0 0a6.017 6.017 0 01.17 1.238m-.17-1.237c.312.625.085 1.22-.025 1.757.333.667-.162 1.175-1.207 1.394" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ────────────────────────────────────────────
// LandingPage component
// ────────────────────────────────────────────
export function LandingPage() {
  const { user, loading, signOut } = useAuth();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [joinId, setJoinId] = useState("");
  const reveal = useScrollReveal();

  // ── Load user trips ──
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
    const match = joinId.match(/\/trip\/([a-zA-Z0-9_-]+)/);
    const id = match ? match[1] : joinId.trim();
    window.location.href = `/trip/${id}`;
  };

  // ── Feature data ──
  const features = [
    {
      icon: <PlaneIcon className="w-6 h-6" />,
      title: "Smart Flight Search",
      desc: "Prices from every origin city, every weekend in your window — compared side by side automatically.",
      color: "var(--blue)",
      colorSoft: "var(--blue-soft)",
    },
    {
      icon: <HomeIcon className="w-6 h-6" />,
      title: "Airbnb Integration",
      desc: "Stays matched to each weekend with ratings, reviews, and per-person pricing built in.",
      color: "var(--teal)",
      colorSoft: "var(--teal-soft)",
    },
    {
      icon: <CurrencyIcon className="w-6 h-6" />,
      title: "Group Cost Splitting",
      desc: "Everyone flying from different cities? See exactly what each person pays — flights and stay combined.",
      color: "var(--gold)",
      colorSoft: "var(--gold-soft)",
    },
    {
      icon: <TrophyIcon className="w-6 h-6" />,
      title: "Weekend Rankings",
      desc: "Five algorithms rank weekends by total cost, per-person cost, fairness, value, and more.",
      color: "var(--orange)",
      colorSoft: "var(--orange-soft)",
    },
    {
      icon: <BoltIcon className="w-6 h-6" />,
      title: "Real-time Scraping",
      desc: "Live data from Google Flights and Airbnb. Prices update so you always see what's current.",
      color: "var(--red)",
      colorSoft: "var(--red-soft)",
    },
    {
      icon: <SparklesIcon className="w-6 h-6" />,
      title: "Travel Insights",
      desc: "Weather forecasts, local events, and tourism data for your destination — all in one place.",
      color: "var(--rose)",
      colorSoft: "var(--rose-soft)",
    },
  ];

  const steps = [
    {
      num: "01",
      icon: <CalendarIcon className="w-7 h-7" />,
      title: "Configure Your Trip",
      desc: "Pick your destination, add everyone's origin city, set your travel window, and let the wizard handle the rest.",
    },
    {
      num: "02",
      icon: <GlobeIcon className="w-7 h-7" />,
      title: "We Find the Best Deals",
      desc: "Automated scraping compares flight prices and Airbnb listings for every weekend across all your cities.",
    },
    {
      num: "03",
      icon: <UsersIcon className="w-7 h-7" />,
      title: "Pick the Best Weekend",
      desc: "Share one link with your group. Everyone sees the same ranked weekends with per-person costs — no back-and-forth.",
    },
  ];

  const destCounter = useCountUp(50, 1200);
  const algoCounter = useCountUp(5, 1000);
  const weekendCounter = useCountUp(24, 1400);
  const cityCounter = useCountUp(100, 1600);

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-1)]">
      {/* ═══════════════════════════════════════════
          Section 1: Header / Nav
          ═══════════════════════════════════════════ */}
      <header className="glass border-b border-[var(--border-default)] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--blue)] flex items-center justify-center">
              <PlaneIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-heading font-bold tracking-tight">TripSync</span>
          </a>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
              How It Works
            </a>
            <a href="#features" className="text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
              Features
            </a>
            <a href="#preview" className="text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
              Dashboard Preview
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <>
                <span className="text-xs text-[var(--text-3)] font-mono hidden sm:inline truncate max-w-[140px]">
                  {user.email}
                </span>
                <a
                  href="/trip/new"
                  className="h-8 px-3 rounded-md text-xs font-medium bg-[var(--blue)] text-white hover:brightness-110 transition-all duration-150 inline-flex items-center gap-1.5"
                >
                  Dashboard
                </a>
                <button
                  onClick={signOut}
                  className="h-8 px-3 rounded-md text-xs font-medium bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-all duration-150"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => openAuth("signin")}
                  className="h-8 px-3 rounded-md text-xs font-medium bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-all duration-150"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="h-8 px-3 rounded-md text-xs font-medium bg-[var(--blue)] text-white hover:brightness-110 transition-all duration-150"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          Section 2: Hero
          ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Background gradient orbs — parallax */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div ref={useParallax(0.15)} className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[var(--blue)] opacity-[0.06] blur-3xl" />
          <div ref={useParallax(-0.1)} className="absolute top-48 -left-24 w-72 h-72 rounded-full bg-[var(--teal)] opacity-[0.05] blur-3xl" />
          <div ref={useParallax(0.2)} className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full bg-[var(--gold)] opacity-[0.03] blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <div ref={reveal} className="scroll-reveal-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--blue-soft)] border border-[var(--blue-border)] mb-6">
                  <SparklesIcon className="w-3.5 h-3.5 text-[var(--blue)]" />
                  <span className="text-xs font-medium text-[var(--blue)]">The Smartest Way to Plan Group Trips</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold tracking-tight leading-[1.1] mb-5">
                  Group Trips,{" "}
                  <span className="bg-gradient-to-r from-[var(--blue)] to-[var(--teal)] bg-clip-text text-transparent">
                    Without the Chaos
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-[var(--text-2)] leading-relaxed mb-8 max-w-lg">
                  Coordinate flights, stays, and costs across multiple cities. Find the cheapest weekend
                  for your entire group in minutes — no more spreadsheets, no more endless group chats.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <a
                    href="/trip/new"
                    className="inline-flex items-center gap-2 h-12 px-7 rounded-lg text-sm font-semibold bg-[var(--blue)] text-white hover:brightness-110 transition-all duration-150 shadow-lg shadow-[var(--blue)]/20"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Start Planning Free
                  </a>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 h-12 px-5 rounded-lg text-sm font-medium text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                  >
                    See how it works
                    <ArrowRightIcon className="w-4 h-4" />
                  </a>
                </div>
                <p className="mt-6 text-xs text-[var(--text-3)]">
                  Bachelor parties, friend getaways, family reunions — any group, any destination
                </p>
              </div>
            </div>

            {/* Right: Product mockup */}
            <div ref={reveal} className="scroll-reveal-hero-mockup hidden lg:block">
              <div className="relative rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-1 shadow-2xl shadow-black/30">
                {/* Fake browser chrome */}
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border-default)]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--red)] opacity-60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--gold)] opacity-60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--teal)] opacity-60" />
                  <div className="flex-1 mx-3 h-5 rounded bg-[var(--surface-2)] flex items-center px-2">
                    <span className="text-[10px] text-[var(--text-3)] font-mono">tripsync.app/trip/bachelor-vegas-2026</span>
                  </div>
                </div>
                {/* Dashboard mockup content */}
                <div className="p-4 space-y-3">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Best Weekend", value: "Jun 12-15", accent: "var(--teal)" },
                      { label: "Group Cost", value: "$2,847", accent: "var(--blue)" },
                      { label: "Per Person", value: "$474", accent: "var(--gold)" },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)]">
                        <div className="text-[10px] text-[var(--text-3)] mb-1">{stat.label}</div>
                        <div className="text-sm font-heading font-bold" style={{ color: stat.accent }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Fake chart area */}
                  <div className="h-28 rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)] p-3 flex items-end gap-1.5">
                    {[40, 65, 50, 85, 70, 90, 55, 75, 60, 80, 45, 70].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{
                          height: `${h}%`,
                          background: i === 5 ? "var(--teal)" : "var(--blue)",
                          opacity: i === 5 ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                  {/* Fake table rows */}
                  <div className="space-y-1.5">
                    {[
                      { rank: "#1", dates: "Jun 12-15", cost: "$2,847", badge: "Best" },
                      { rank: "#2", dates: "Jun 19-22", cost: "$3,102", badge: "" },
                      { rank: "#3", dates: "Jul 3-6", cost: "$3,341", badge: "" },
                    ].map((row) => (
                      <div key={row.rank} className="flex items-center gap-3 p-2 rounded-md bg-[var(--surface-2)]/50">
                        <span className="text-xs font-mono font-bold text-[var(--text-3)] w-6">{row.rank}</span>
                        <span className="text-xs text-[var(--text-1)] flex-1">{row.dates}</span>
                        <span className="text-xs font-mono text-[var(--text-2)]">{row.cost}</span>
                        {row.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal-border)]">
                            {row.badge}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 3: Your Trips (auth-conditional)
          ═══════════════════════════════════════════ */}
      {user && (
        <section className="border-t border-[var(--border-default)] bg-[var(--surface-1)]/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div ref={reveal} className="scroll-reveal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-heading font-bold">Your Trips</h2>
                <a
                  href="/trip/new"
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-xs font-medium bg-[var(--blue)] text-white hover:brightness-110 transition-all duration-150"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  New Trip
                </a>
              </div>

              {tripsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-xl bg-[var(--surface-1)] border border-[var(--border-default)] animate-pulse" />
                  ))}
                </div>
              ) : trips.length === 0 ? (
                <div className="p-8 rounded-xl bg-[var(--surface-1)] border border-[var(--border-default)] text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center">
                    <PlaneIcon className="w-6 h-6 text-[var(--text-3)]" />
                  </div>
                  <p className="text-sm text-[var(--text-2)] mb-3">No trips yet. Create your first one!</p>
                  <a
                    href="/trip/new"
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-md text-sm font-medium bg-[var(--blue)] text-white hover:brightness-110 transition-all duration-150"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create Trip
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trips.map((trip) => (
                    <a
                      key={trip.id}
                      href={`/trip/${trip.id}`}
                      className="block p-5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--blue-border)] hover:bg-[var(--surface-2)] transition-all duration-200 group glow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-heading font-semibold text-[var(--text-1)] group-hover:text-[var(--blue)] transition-colors">
                          {trip.name}
                        </h3>
                        <ChevronRightIcon className="w-4 h-4 text-[var(--text-3)] group-hover:text-[var(--blue)] transition-colors shrink-0 mt-0.5" />
                      </div>
                      <p className="text-xs text-[var(--text-3)] font-mono">
                        {trip.destination_city || trip.destination_airport}
                        {" \u00b7 "}
                        {trip.cities?.filter((c: { city: string }) => c.city).length ?? 0} cities
                        {" \u00b7 "}
                        {trip.total_people} people
                      </p>
                    </a>
                  ))}
                  {/* Create new trip card */}
                  <a
                    href="/trip/new"
                    className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-[var(--border-default)] hover:border-[var(--blue-border)] text-[var(--text-3)] hover:text-[var(--blue)] transition-all duration-200 min-h-[100px]"
                  >
                    <PlusIcon className="w-6 h-6 mb-1.5" />
                    <span className="text-xs font-medium">Create New Trip</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          Section 4: How It Works
          ═══════════════════════════════════════════ */}
      <section id="how-it-works" className="border-t border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div ref={reveal} className="scroll-reveal text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight mb-3">
              How It Works
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-2)] max-w-md mx-auto">
              From &ldquo;where should we go?&rdquo; to &ldquo;we&rsquo;re booked&rdquo; in three steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((step, i) => (
              <div
                key={step.num}
                ref={reveal}
                className={`scroll-reveal-tilt scroll-reveal-delay-${i + 1} relative`}
              >
                {/* Connector line (hidden on mobile, hidden on last) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-px bg-gradient-to-r from-[var(--border-default)] to-transparent" />
                )}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--blue-soft)] border border-[var(--blue-border)] text-[var(--blue)] mb-4">
                    {step.icon}
                  </div>
                  <div className="text-xs font-mono font-bold text-[var(--blue)] mb-2">
                    STEP {step.num}
                  </div>
                  <h3 className="text-base font-heading font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-[var(--text-2)] leading-relaxed max-w-xs mx-auto">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 5: Feature Grid
          ═══════════════════════════════════════════ */}
      <section id="features" className="border-t border-[var(--border-default)] bg-[var(--surface-1)]/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div ref={reveal} className="scroll-reveal text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight mb-3">
              Everything You Need
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-2)] max-w-md mx-auto">
              The tools that replace your spreadsheet, your group chat, and hours of tab-switching
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                ref={reveal}
                className={`scroll-reveal-bounce scroll-reveal-delay-${(i % 3) + 1} glow p-5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all duration-200 hover:scale-[1.03] hover:-translate-y-1`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    background: feature.colorSoft,
                    color: feature.color,
                    border: `1px solid color-mix(in oklch, ${feature.color} 25%, transparent)`,
                  }}
                >
                  {feature.icon}
                </div>
                <h3 className="text-sm font-heading font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-xs text-[var(--text-2)] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 6: Dashboard Preview
          ═══════════════════════════════════════════ */}
      <section id="preview" className="border-t border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div ref={reveal} className="scroll-reveal text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight mb-3">
              One Dashboard for the Whole Group
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-2)] max-w-md mx-auto">
              Flights, stays, per-person costs, and weekend rankings — everyone sees the same data
            </p>
          </div>

          <div ref={reveal} className="scroll-reveal-scale">
            <div className="relative rounded-2xl border border-[var(--border-default)] bg-gradient-to-br from-[var(--surface-1)] to-[var(--surface-0)] p-6 sm:p-8 overflow-hidden">
              {/* Glow effects */}
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-[var(--blue)] opacity-[0.03] blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[var(--teal)] opacity-[0.03] blur-3xl pointer-events-none" />

              <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Weekends Compared", value: "12", icon: <CalendarIcon className="w-4 h-4" /> },
                  { label: "Cities Tracked", value: "6", icon: <GlobeIcon className="w-4 h-4" /> },
                  { label: "Total Savings", value: "$1,230", icon: <CurrencyIcon className="w-4 h-4" /> },
                  { label: "Group Members", value: "8", icon: <UsersIcon className="w-4 h-4" /> },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border-default)]">
                    <div className="flex items-center gap-2 text-[var(--text-3)] mb-2">
                      {stat.icon}
                      <span className="text-[11px]">{stat.label}</span>
                    </div>
                    <div className="text-xl font-heading font-bold">{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Fake rankings table */}
              <div className="relative rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border-default)] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border-default)]">
                  <span className="text-xs font-heading font-semibold text-[var(--text-2)]">Weekend Rankings</span>
                </div>
                <div className="divide-y divide-[var(--border-default)]">
                  {[
                    { rank: 1, dates: "Jun 12 - Jun 15", cost: "$2,847", pp: "$474/pp", score: 92, change: "+2" },
                    { rank: 2, dates: "Jun 19 - Jun 22", cost: "$3,102", pp: "$517/pp", score: 85, change: "-1" },
                    { rank: 3, dates: "Jul 3 - Jul 6", cost: "$3,341", pp: "$557/pp", score: 78, change: "+1" },
                    { rank: 4, dates: "Jun 26 - Jun 29", cost: "$3,520", pp: "$587/pp", score: 71, change: "-2" },
                  ].map((row) => (
                    <div key={row.rank} className="flex items-center gap-4 px-4 py-3">
                      <span
                        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-bold shrink-0"
                        style={{
                          background: row.rank === 1 ? "var(--teal-soft)" : "var(--surface-2)",
                          color: row.rank === 1 ? "var(--teal)" : "var(--text-3)",
                          border: row.rank === 1 ? "1px solid var(--teal-border)" : "1px solid var(--border-default)",
                        }}
                      >
                        {row.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{row.dates}</div>
                        <div className="text-[11px] text-[var(--text-3)] font-mono">{row.pp}</div>
                      </div>
                      <div className="hidden sm:block">
                        <div className="w-24 h-1.5 rounded-full bg-[var(--surface-3)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${row.score}%`,
                              background: row.rank === 1 ? "var(--teal)" : "var(--blue)",
                              opacity: row.rank === 1 ? 1 : 0.5,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-[var(--text-2)] w-16 text-right">{row.cost}</span>
                      <span
                        className="text-[11px] font-mono w-8 text-right"
                        style={{ color: row.change.startsWith("+") ? "var(--teal)" : "var(--red)" }}
                      >
                        {row.change}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 7: Trust / Stats Bar
          ═══════════════════════════════════════════ */}
      <section className="border-t border-[var(--border-default)] bg-[var(--surface-1)]/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {[
              { ref: destCounter.ref, value: `${destCounter.count}+`, label: "Destinations", icon: <GlobeIcon className="w-5 h-5" /> },
              { ref: algoCounter.ref, value: `${algoCounter.count}`, label: "Scoring Algorithms", icon: <SparklesIcon className="w-5 h-5" /> },
              { ref: weekendCounter.ref, value: `${weekendCounter.count}+`, label: "Weekends Analyzed", icon: <CalendarIcon className="w-5 h-5" /> },
              { ref: cityCounter.ref, value: `${cityCounter.count}+`, label: "Cities Supported", icon: <PlaneIcon className="w-5 h-5" /> },
            ].map((stat) => (
              <div key={stat.label} ref={stat.ref} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--blue-soft)] text-[var(--blue)] mb-3">
                  {stat.icon}
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-bold bg-gradient-to-r from-[var(--blue)] to-[var(--teal)] bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-[var(--text-2)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 8: Join Trip (unauth only)
          ═══════════════════════════════════════════ */}
      {!user && !loading && (
        <section className="border-t border-[var(--border-default)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div ref={reveal} className="scroll-reveal max-w-lg mx-auto text-center">
              <h2 className="text-xl sm:text-2xl font-heading font-bold mb-2">Invited to a Trip?</h2>
              <p className="text-sm text-[var(--text-2)] mb-6">
                Paste the link or trip ID your group organizer shared with you
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  className="flex-1 h-12 px-4 rounded-lg text-sm bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] focus:outline-none focus:border-[var(--border-active)] transition-all duration-150 placeholder:text-[var(--text-3)]"
                  placeholder="Paste trip URL or ID..."
                />
                <button
                  onClick={handleJoin}
                  disabled={!joinId.trim()}
                  className="h-12 px-6 rounded-lg text-sm font-semibold bg-[var(--blue)] text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                >
                  Join Trip
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          Section 9: Final CTA Banner
          ═══════════════════════════════════════════ */}
      <section className="border-t border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div ref={reveal} className="scroll-reveal-scale">
            <div className="relative rounded-2xl overflow-hidden p-8 sm:p-12 text-center bg-gradient-to-br from-[var(--blue)] via-[oklch(0.55_0.18_240)] to-[var(--teal)]">
              {/* Noise texture overlay */}
              <div className="absolute inset-0 opacity-10 bg-[url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4zIi8+PC9zdmc+&quot;)]" />

              <div className="relative">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white mb-3">
                  Stop Planning in Group Chats
                </h2>
                <p className="text-sm sm:text-base text-white/80 max-w-md mx-auto mb-8">
                  Set up your trip in minutes. Share one link. Everyone sees flights, stays, and costs — ranked by what works best for the group.
                </p>
                <a
                  href="/trip/new"
                  className="inline-flex items-center gap-2 h-12 px-8 rounded-lg text-sm font-semibold bg-white text-slate-900 hover:bg-white/90 transition-all duration-150 shadow-lg"
                >
                  <PlusIcon className="w-4 h-4" />
                  Start Planning Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 10: Footer
          ═══════════════════════════════════════════ */}
      <footer className="border-t border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[var(--blue)] flex items-center justify-center">
                <PlaneIcon className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-heading font-bold">TripSync</span>
            </div>
            <p className="text-xs text-[var(--text-3)]">
              Group trips, simplified. Plan smarter, travel together.
            </p>
          </div>
        </div>
      </footer>

      {/* ── Auth Modal ── */}
      <AuthModal open={showAuth} onOpenChange={setShowAuth} defaultTab={authTab} />
    </div>
  );
}
