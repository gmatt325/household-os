# Household OS

Shared daily task dashboard for two people, backed by Supabase.

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
The `useTodaysTasks` hook subscribes to `postgres_changes` on the `tasks` table and refetches on any change. For this to work end-to-end, ensure realtime replication is enabled for `tasks` in Supabase (Database → Replication → enable for `public.tasks`).

## Recurrence rules
Stored as a string on `tasks.recurrence`. Supported values:
- `daily`
- `weekdays` / `weekends`
- `weekly:mon,wed,fri`
- `monthly:15`

Anything else is logged once and treated as not-applicable for today.
