# Household OS

Shared household app for two people, backed by Supabase. Three tabs:

- **Poppy** (`/dashboard/puppy`) — real-time puppy care logging: potty, meals, crate, walks, weight.
  Full-width tap tiles with live count-up timers, a sleep summary, and a swipeable day timeline you can
  tap to retime or delete any entry. Dark night mode switches on automatically 22:00–06:00.
  **This is the default landing tab** — `/dashboard` redirects here.
- **Home** (`/dashboard/home`) — the shared daily task dashboard (four categories, animated pill rows).
- **Fitness** (`/dashboard/fitness`) — single-user workout logbook driven by a program + weekly plans.

`CLAUDE.md` is the authoritative spec: Supabase schema, the full `src/` tree, and per-tab design notes.

## Stack
- React 18 + Vite 5
- Tailwind CSS 3
- @supabase/supabase-js v2 (auth, postgres, realtime)
- React Router v6
- Deploy: Vercel

## Setup

```bash
npm install
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

For this project, the Supabase values are:

```
VITE_SUPABASE_URL=https://ogbhcxvpixcpwtwawdet.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_1dDkOnbIGJkWt3ysxrdgIg_9VH0fCLc
```

Create the two user accounts (Grant, Ishita) manually in the Supabase dashboard — there is no sign-up UI.

## Scripts
- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the built app

## Deploy to Vercel
1. Push the repo to GitHub.
2. Import in Vercel; framework preset auto-detects Vite.
3. Add the two `VITE_SUPABASE_*` env vars in Project Settings → Environment Variables.
4. Deploy.

## Realtime
Hooks subscribe to `postgres_changes` and refetch on any change — `useTodaysTasks` on `tasks`, and the
puppy hooks (`usePuppyLive`, `usePuppyDaily`, `usePuppyDay`) on `puppy_events` / `puppy_sessions` /
`puppy_profile`, so two phones stay in sync while logging.

For this to work end-to-end the tables must be in the realtime publication. The puppy tables were added
in the `create_puppy_tables` migration; `tasks` has to be enabled by hand in Supabase
(Database → Replication → enable for `public.tasks`).

## Recurrence rules
Stored as a string on `tasks.recurrence`. Supported values:
- `daily`
- `weekdays` / `weekends`
- `weekly:mon,wed,fri`
- `monthly:15`

Anything else is logged once and treated as not-applicable for today.
