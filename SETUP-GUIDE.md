# Bachelor Trip Planner — Setup Guide

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `bachelor-trip-planner` 
   - **Database Password**: choose a strong password (save it somewhere) Password:AdityaAditi2026
   - **Region**: pick the closest to you (e.g., East US)
4. Click **"Create new project"** and wait ~2 minutes for it to provision

## Step 2: Run the Database Migration

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Copy the entire contents and paste it into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" — this means all tables were created

### Verify Tables Were Created
- Click **"Table Editor"** in the left sidebar
- You should see 5 tables: `config`, `flights`, `flight_options`, `airbnb_listings`, `scrape_jobs`

## Step 3: Get Your Supabase Keys

1. In the Supabase dashboard, go to **Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon/public key** — the shorter JWT token under "Project API keys"
   - **service_role key** — click "Reveal" to see it (this is the secret one — never expose in frontend)

## Step 4: Set Up Environment Variables Locally

1. Open the file `.env.local` in the project root
2. Replace the placeholder values with your real Supabase keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...your-anon-key
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...your-service-role-key
```

Leave the `GITHUB_PAT` and `GITHUB_REPO` as placeholders for now — you'll fill those in after Step 7.

## Step 5: Seed the Default Configuration

1. Open a terminal in the project folder (`bachelor-trip-planner/`)
2. Run:

```bash
npx ts-node scripts/seed-config.ts
```

> **If you get a ts-node error**, install it first:
> ```bash
> npm install -D ts-node
> ```
> Then also add `"ts-node": { "compilerOptions": { "module": "commonjs" } }` to your `tsconfig.json`, or run with:
> ```bash
> npx tsx scripts/seed-config.ts
> ```

3. You should see:
```
Config seeded successfully!
  Cities: 10
  Total people: 17
```

### Verify in Supabase
- Go to **Table Editor** → click `config` → you should see 1 row with all 10 cities in the `cities` JSON column

## Step 6: Test the App Locally

1. In the project folder, run:

```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser
3. You should see the dashboard with:
   - The header saying "Tulum Bachelor Trip Planner"
   - Filter bar for flight type and Airbnb budget
   - A "No Data Yet" message (since no scraping has happened)
   - The Config button should open a modal showing all 10 cities

## Step 7: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository:
   - **Name**: `bachelor-trip-planner`
   - **Visibility**: Public (recommended — gives unlimited GitHub Actions minutes) or Private (2,000 min/month free)
3. Do NOT initialize with a README (your project already has files)
4. In your terminal, run:

```bash
cd bachelor-trip-planner
git add -A
git commit -m "Initial commit: Bachelor Trip Planner"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/bachelor-trip-planner.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

## Step 8: Create a GitHub Personal Access Token (PAT)

This token lets the app trigger scraping workflows from the UI.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Fill in:
   - **Note**: `bachelor-trip-planner`
   - **Expiration**: 90 days (or longer)
   - **Scopes**: check `repo` (full repo access — needed for workflow dispatch)
4. Click **"Generate token"**
5. **Copy the token immediately** (it starts with `ghp_...`) — you won't see it again

## Step 9: Add GitHub Actions Secrets

1. Go to your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"** and add these one at a time:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_URL` | Your Supabase Project URL (e.g., `https://abcdefgh.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key |

## Step 10: Update `.env.local` with GitHub Info

Now go back to your `.env.local` file and fill in the GitHub values:

```env
GITHUB_PAT=ghp_your-token-here
GITHUB_REPO=YOUR-USERNAME/bachelor-trip-planner
```

## Step 11: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **"Add New..."** → **"Project"**
3. Find and select your `bachelor-trip-planner` repository
4. Vercel will auto-detect it's a Next.js project
5. Before clicking "Deploy", expand **"Environment Variables"** and add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key |
| `GITHUB_PAT` | Your GitHub PAT (`ghp_...`) |
| `GITHUB_REPO` | `YOUR-USERNAME/bachelor-trip-planner` |

6. Click **"Deploy"**
7. Wait ~1-2 minutes for the build to finish
8. Vercel will give you a URL like `https://bachelor-trip-planner.vercel.app`

## Step 12: Trigger the First Scrape

You have two options:

### Option A: From the UI
1. Visit your deployed app URL
2. Click the **"Refresh Data"** button in the header
3. This dispatches the GitHub Actions workflow

### Option B: From GitHub
1. Go to your repo → **Actions** tab
2. Click **"Scrape Flight & Airbnb Data"** in the left sidebar
3. Click **"Run workflow"** → select `all` → click **"Run workflow"**

### Monitor the Scrape
- Go to **Actions** tab on GitHub to see the workflow running
- The flight scrape takes ~30-45 minutes, Airbnb scrape ~15-25 minutes
- Once complete, refresh your app — you should see weekend cards populated with data

## Step 13: Verify Everything Works

1. Visit your app URL
2. You should now see ranked weekend cards with:
   - Score badges (1-100)
   - Flight prices per city
   - Airbnb villa listings
   - Cost breakdowns
3. Try changing the filters (flight category, budget tier) — scores should recalculate instantly
4. Click the Config button — you should be able to add/remove cities

## Ongoing: Automatic Scraping

The GitHub Actions workflow runs automatically every 12 hours (6 AM and 6 PM UTC). Data will stay fresh without any manual intervention.

### Budget Check
- With 2x daily runs: ~1,400 GitHub Actions minutes/month
- Free tier limit: 2,000 min/month (private repo) or unlimited (public repo)
- You're well within the limit

---

## Troubleshooting

### "No Data Yet" after scraping
- Check the GitHub Actions run logs for errors
- Common issue: Supabase secrets not set correctly in GitHub repo settings
- Verify by going to Supabase Table Editor → `flights` table — if rows exist, the API route might have an issue

### Scrape fails with CAPTCHA errors
- This is expected occasionally — Google/Airbnb may block automated requests
- The scraper skips blocked requests and retries on the next run
- If it happens consistently, the scraper may need updated stealth settings

### Config changes don't trigger scrape
- Make sure `GITHUB_PAT` and `GITHUB_REPO` are set in Vercel environment variables
- The PAT needs `repo` scope
- Check the browser console for error responses from `/api/config`

### Build fails on Vercel
- Make sure all 5 environment variables are set in the Vercel dashboard
- The `NEXT_PUBLIC_` prefixed variables must have that exact prefix
