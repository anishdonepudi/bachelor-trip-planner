# Testing Guide: Multi-Trip, Auth & Travel Insights

How to test all new features locally without affecting production.

---

## Prerequisites

- Node.js 20+
- npm
- Supabase CLI (see install options below)
- A Supabase account (free plan allows 2 projects)
- A Google AI Studio account (for Gemini API key)

### Installing Supabase CLI (Windows)

> `npm install -g supabase` does NOT work on Windows.

**Option A — Scoop (recommended):**
```powershell
# Install Scoop first (if you don't have it):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Then install Supabase CLI:
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Option B — Skip the CLI entirely:**
You can run migrations manually via the **Supabase Dashboard > SQL Editor**.
Just paste the contents of each file in `supabase/migrations/` (001 through 010) and execute them in order.

---

## 1. Create a Staging Supabase Project

> Skip if you already have a staging project.

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Name: `bachelor-trip-staging` (or similar)
4. Region: same as production
5. Set a database password — **save it**

Once created, go to **Project Settings > API** and copy:

| Value | Where to find it |
|-------|-----------------|
| Project URL | `https://xxxx.supabase.co` |
| `anon` public key | Under "Project API keys" |
| `service_role` secret key | Under "Project API keys" (click reveal) |
| Project Reference ID | The `xxxx` part of the URL |

---

## 2. Run Migrations on Staging

**Option A — Using Supabase CLI:**
```bash
supabase login
# Paste your access token from supabase.com/dashboard/account/tokens

supabase link --project-ref YOUR_STAGING_PROJECT_REF
supabase db push
```

**Option B — Using Supabase Dashboard:**
1. Go to your **Staging** project in the Supabase dashboard
2. Open **SQL Editor**
3. For each file in `supabase/migrations/` (001 through 010), paste the SQL and click **Run**
4. Run them **in order** — later migrations depend on earlier ones

This creates all tables including the new `trips`, `trip_collaborators`, and `tourism_data` tables.

---

## 3. Enable Auth on Staging

In the **Staging** Supabase dashboard:

1. Go to **Authentication > Providers > Email** — ensure it's enabled
2. Go to **Authentication > URL Configuration**:
   - Set **Site URL** to `http://localhost:3000`
   - Add `http://localhost:3000/**` to **Redirect URLs**

---

## 4. Get a Gemini API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **Create API Key**
3. Copy the key — you'll need it in the next step

---

## 5. Configure Environment Variables

Update `.env.local` to point at staging:

```env
# ── Staging Supabase ──
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_STAGING_REF.supabase.co
SUPABASE_URL=https://YOUR_STAGING_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
SUPABASE_SERVICE_KEY=your_staging_service_key

# ── Keep existing ──
GITHUB_PAT=your_existing_pat
GITHUB_REPO=your_existing_repo
GEONAMES_USERNAME=your_existing_username

# ── New ──
GEMINI_API_KEY=your_gemini_key_from_step_4
```

---

## 6. Start the Dev Server

```bash
npm run dev
```

App runs at `http://localhost:3000`.

---

## 7. Test Each Feature

### A. Landing Page & Auth

- [ ] Go to `http://localhost:3000` — should see the **Landing Page** (not the old dashboard)
- [ ] Click **Sign Up** — create an account with a real email
- [ ] Check email for Supabase verification link
- [ ] Click the verification link
- [ ] Return to `http://localhost:3000` — header should show your email and "My Trips"

### B. Trip Creation Wizard

- [ ] Click **"Plan a New Trip"** on the landing page
- [ ] **Step 1 — Trip Basics**
  - [ ] Enter a trip name (e.g., "Test Barcelona Trip")
  - [ ] Search for a destination (e.g., "Barcelona")
  - [ ] Airport badge should appear (e.g., BCN)
- [ ] **Step 2 — Travel Group**
  - [ ] Add origin cities with people counts
  - [ ] Verify airport badges appear for each city
- [ ] **Step 3 — Trip Dates**
  - [ ] **Travel Insights** panel should appear at the top with a 12-month grid
  - [ ] Click a month to expand — verify temperature, crowds, events display
  - [ ] Click **"Set window"** button — verify the month range dropdowns update below
  - [ ] Set trip duration and departure days
  - [ ] Calendar should show potential trip dates
- [ ] **Step 4 — Flight Preferences**
  - [ ] Configure categories and time filters
- [ ] Click **Create Trip** — should redirect to `/trip/[newId]`

### C. Trip Dashboard

- [ ] Dashboard loads at `/trip/[tripId]`
- [ ] Trip name shows in the header
- [ ] "Share" button copies the URL
- [ ] "Back" link goes to landing page

### D. Travel Insights in ConfigModal

- [ ] On the trip dashboard, click **Configure** (gear icon)
- [ ] Expand the **Schedule** section
- [ ] **Travel Insights** panel should appear above the Trip Window picker
- [ ] Click a month — verify it expands with full details
- [ ] Click **"Set window"** — verify month range updates
- [ ] "Unsaved changes" indicator should appear

### E. Shareable URLs & Permissions

- [ ] Copy the trip URL (e.g., `http://localhost:3000/trip/abc123`)
- [ ] Open an **incognito/private** browser window
- [ ] Paste the URL — dashboard should load in **view-only** mode
- [ ] Verify: no Configure button visible
- [ ] Verify: Trigger Refresh button still works
- [ ] Sign in with the same account in incognito — Configure button should appear

### F. Multi-Trip Support

- [ ] Go back to `http://localhost:3000`
- [ ] Your first trip should appear under **"My Trips"**
- [ ] Create a second trip with a different destination
- [ ] Both trips should show on the landing page
- [ ] Each trip has independent data and configuration

### G. Tourism Data Admin Refresh

Test the admin refresh endpoint (replace `YOUR_STAGING_SERVICE_KEY`):

```bash
curl -X POST http://localhost:3000/api/admin/refresh-tourism \
  -H "Authorization: Bearer YOUR_STAGING_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

Expected response:

```json
{
  "totalQueued": 150,
  "processed": 5,
  "remaining": 145,
  "generated": 5,
  "failed": 0,
  "results": [...]
}
```

Options:
- `{"limit": 50}` — process 50 cities per request
- `{"force": true}` — regenerate even if already cached
- `{"onlyUserCities": true}` — only refresh cities from existing trips

---

## 8. Verify Production Build

```bash
npm run build
```

Must complete with no errors.

---

## 9. Push to Feature Branch

```bash
git checkout -b feature/multi-trip-auth-insights
git add .
git commit -m "Add multi-trip support, auth, and travel insights"
git push -u origin feature/multi-trip-auth-insights
```

This triggers CI (lint, test, build) but does **NOT** deploy to production.

---

## 10. Create a Pull Request

Open a PR: `feature/multi-trip-auth-insights` → `main`

CI will run automatically. Review the PR.

---

## 11. Before Merging to Production

### Vercel Environment Variables

Edit the existing variables to scope them to **Production only**, then add staging duplicates for **Preview only**:

| Variable | Scope | Value |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | prod URL (existing value) |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview | staging URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | prod anon key (existing value) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview | staging anon key |
| `SUPABASE_SERVICE_KEY` | Production | prod service key (existing value) |
| `SUPABASE_SERVICE_KEY` | Preview | staging service key |
| `SUPABASE_URL` | Production | prod URL |
| `SUPABASE_URL` | Preview | staging URL |
| `ENVIRONMENT` | Production | `production` |
| `ENVIRONMENT` | Preview | `staging` |
| `GEMINI_API_KEY` | All Environments | your Gemini key |
| `GEONAMES_USERNAME` | All Environments | your GeoNames username |
| `GITHUB_PAT` | All Environments | (unchanged) |
| `GITHUB_REPO` | All Environments | (unchanged) |

### GitHub Actions Secrets

Add these two new repository secrets (alongside the existing `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`):

| Secret | Value |
|--------|-------|
| `STAGING_SUPABASE_URL` | Staging Supabase project URL |
| `STAGING_SUPABASE_SERVICE_KEY` | Staging Supabase service role key |

### Merge

Merge the PR. CI will:
1. Run tests and build
2. Run migrations on production Supabase (via `supabase db push`)
3. Vercel auto-deploys the new code

---

## What's Protected

| Resource | During Testing | Production |
|----------|---------------|------------|
| Database | Separate staging Supabase project | Untouched |
| Auth users | New test accounts on staging | No impact |
| Deployments | Local only (`npm run dev`) | Only deploys on merge to `main` |
| Migrations | Manual via `supabase db push` to staging | Automatic via CI on merge |
| Tourism data | Generated in staging DB | Empty until admin refresh is run |
| Existing data | Not affected (different DB) | Preserved |

---

## Troubleshooting

### "GEMINI_API_KEY not set" warning
- Gemini generation is skipped — falls back to static data, then returns weather-only insights
- Add the key to `.env.local` and restart dev server

### Auth verification email not arriving
- Check spam folder
- In Supabase Dashboard > Authentication > Email Templates — verify templates exist
- Alternatively: disable email verification in Authentication > Providers > Email for local testing

### Travel Insights shows loading but no data
- Check browser console for API errors
- Verify `GEONAMES_USERNAME` is set (needed for coordinate resolution)
- Verify the destination city was selected from the dropdown (not manually typed)

### "Table does not exist" errors
- Migrations haven't been run on staging
- Run `supabase db push` again

### ConfigModal doesn't show Travel Insights
- Expand the **Schedule** section first (lazy-loaded)
- Destination city must be set in Trip Setup section
