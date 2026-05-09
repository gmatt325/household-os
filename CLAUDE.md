# Household OS — Claude Reference

## Project Overview
Shared daily task dashboard for two people (Grant & Ishita). Tasks are grouped into four categories and displayed as animated pill rows. Changes sync live between both users via Supabase realtime.

## Local Setup
- **Path:** `/Users/ishitagupta/Documents/Claude/Household Dashboard`
- **Dev server:** Double-click `start-dev.command` → opens Safari at `http://localhost:5174`
- **Port:** 5174 (5173 is used by a separate finance app)
- **Env vars:** Already in `.env.local` — do not commit this file

## Stack
- React 18 + Vite 5
- Tailwind CSS 3 (custom color tokens: `puppy`, `tasks`, `workouts`, `plants`)
- @supabase/supabase-js v2
- React Router v6
- Deploy: Vercel (auto-deploys from GitHub on push)

## Supabase
- **Project ref:** `ogbhcxvpixcpwtwawdet`
- **Region:** us-east-1
- **URL:** `https://ogbhcxvpixcpwtwawdet.supabase.co`
- **Publishable key:** `sb_publishable_1dDkOnbIGJkWt3ysxrdgIg_9VH0fCLc`

### Tables (do not recreate)
- `tasks` — id, title, notes, due_date, completed, completed_at, assigned_to, category, recurrence, plan_id, created_at
- `plans` — id, title, description, status, created_at
- `calendar_events` — id, gcal_event_id, title, start_time, end_time, calendar_id, description, location, synced_at

### Enums
- `task_category`: puppy | todos | workouts | plant_watering
- `assigned_to`: grant | ishita | both

### Realtime
Enable replication on `public.tasks` in Supabase Dashboard → Database → Replication for live cross-device sync to work.

### Auth
Email/password only. No sign-up UI — accounts created manually in Supabase Dashboard → Authentication → Users. Two users: Grant and Ishita.

## GitHub & Deploy
- **Repo:** `github.com/gmatt325/household-os`
- **GitHub username:** `gmatt325`
- **Vercel:** connected to the GitHub repo, auto-deploys on push to `main`
- **Vercel env vars to set:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## File Structure
```
src/
  main.jsx                  # Root — BrowserRouter + AuthProvider
  App.jsx                   # Routes + ProtectedRoute / PublicOnlyRoute
  index.css                 # Tailwind directives + slideFade keyframe + body gradient
  lib/
    supabase.js             # Single Supabase client (reads env vars)
    recurrence.js           # appliesToday(rule, date) — pure helper
  context/
    AuthContext.jsx         # session, user, signIn, signOut, loading
  hooks/
    useTodaysTasks.js       # Fetch + realtime + group by category + optimistic support
    useToggleTask.js        # Optimistic toggle of completed/completed_at
  pages/
    Login.jsx               # Email/password form, redirects to /dashboard
    Dashboard.jsx           # Header + 4 CategoryRows
  components/
    CategoryRow.jsx         # Label + animated pill + IndicatorDot
    DotButton.jsx           # 62x62 circle dot per task, fills on complete
    IndicatorDot.jsx        # 32px arrow (rotates on expand) / check (all complete)
    TaskItem.jsx            # Row in expanded list with staggered entrance animation
```

## Design Spec
- **Background:** `linear-gradient(160deg, #F7F0E8 0%, #EDE4D8 60%, #E6DDD2 100%)`
- **Max width:** 520px centered
- **Fonts:** Cormorant Garamond (headings/labels, 300/400/500) + Inter (body/dots, 400/500/600)
- **Category colors:** Puppy `#C4724A` · Tasks `#7A6590` · Workouts `#4A8E72` · Plants `#6A9A42`
- **Pill shadow:** `0 2px 4px rgba(0,0,0,0.1), 0 6px 18px rgba(0,0,0,0.12), 0 14px 32px rgba(0,0,0,0.08)` (grey only, no color glow)
- **Pill border-radius:** 44px collapsed → 26px expanded
- **Dot size:** 62×62px
- **Stagger animation:** `slideFade` keyframe, 45ms delay per item via CSS `--i` variable

## Category Row Order (fixed)
1. Puppy (`puppy`)
2. Tasks (`todos`)
3. Workouts (`workouts`)
4. Plants (`plant_watering`)

## Recurrence Rules (src/lib/recurrence.js)
Stored as a string on `tasks.recurrence`:
- `daily`
- `weekdays` / `weekends`
- `weekly:mon,wed,fri`
- `monthly:15`

## What's Not Built Yet
- Task creation / editing UI (tasks added via Supabase dashboard for now)
- Calendar events UI (table exists, no frontend)
- Plans UI (table exists, no frontend)
- Sign-up flow (not needed — manual user creation)
