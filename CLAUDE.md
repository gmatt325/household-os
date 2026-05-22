# Household OS — Claude Reference

## Project Overview
Shared daily task dashboard for two people (Grant & Ishita). Tasks are grouped into four categories and displayed as animated pill rows. Changes sync live between both users via Supabase realtime.

A **Fitness tab** lives alongside the Home tab — dark gym-logbook aesthetic, mobile-first, single user (no per-user separation needed).

## Local Setup
- **Path:** `/Users/ishitagupta/Documents/Claude/Household Dashboard`
- **Dev server (main):** Double-click `start-dev.command` → opens Safari at `http://localhost:5174`
- **Dev server (worktree):** Double-click `start-dev-worktree.command` → opens Safari at `http://localhost:5175`
- **Port:** 5174 main / 5175 worktree (5173 is used by a separate finance app)
- **Env vars:** Already in `.env.local` — do not commit this file. Must be copied into any new worktree.

## Stack
- React 18 + Vite 5
- Tailwind CSS 3 (custom color tokens: `puppy`, `tasks`, `workouts`, `plants`)
- @supabase/supabase-js v2
- React Router v6
- @dnd-kit/core + @dnd-kit/sortable — drag-to-reorder for exercises and stretch moves
- Deploy: Vercel (auto-deploys from GitHub on push to `main`)

## Supabase
- **Project ref:** `ogbhcxvpixcpwtwawdet`
- **Region:** us-east-1
- **URL:** `https://ogbhcxvpixcpwtwawdet.supabase.co`
- **Publishable key:** `sb_publishable_1dDkOnbIGJkWt3ysxrdgIg_9VH0fCLc`

### Tables (do not recreate)
**Household:**
- `tasks` — id, title, notes, due_date, completed, completed_at, assigned_to, category, recurrence, plan_id, created_at
- `plans` — id, title, description, status, created_at
- `calendar_events` — id, gcal_event_id, title, start_time, end_time, calendar_id, description, location, synced_at

**Fitness (all have RLS enabled with `authenticated` read/write policies):**
- `fitness_programs` — id, name, phase, start_date, end_date, goal, weekly_structure, current_week, status, notes. Active program has `status = 'active'` (NOT a boolean `active` column).
- `fitness_weekly_plans` — id, program_id, week_number, week_start, week_end, mode, days (JSONB), notes. Days keyed by ISO date e.g. `"2026-05-11"`. May have overlapping date ranges — always pick the one with the latest `week_start`.
- `fitness_workout_logs` — id, program_id, weekly_plan_id, workout_date, workout_type, duration_minutes, exercises (JSONB), peloton_output_watts, peloton_ride_type, active_calories, avg_heart_rate, max_heart_rate, perceived_exertion, notes
- `fitness_body_metrics` — id, logged_date, weight_lbs, waist_inches, chest_inches, arm_inches, thigh_inches, resting_heart_rate, hrv, notes
- `fitness_profile` — id, name, age, height_inches, weight_lbs, primary_goal, secondary_goals, injuries_limitations, equipment, notes

### fitness_weekly_plans day JSONB shape
Each day entry (new format, ISO date key):
```json
{
  "type": "lift" | "cardio" | "rest" | "stretch",
  "time": "morning" | "evening",
  "workout": "Upper Lift A",
  "location": "gym" | "home",
  "exercises": [{ "name": "...", "reps": "8-12", "sets": 3, "weight_lbs": 60, "note": "optional" }],
  "morning_stretch": { "focus": "...", "moves": ["Cat-cow x10", ...], "duration_minutes": 10 },
  "notes": "optional cardio notes"
}
```
Old format used `label` instead of `workout` and `exercises[]` with `duration`/`reps` for stretch days. Code handles both via `plan.label ?? plan.workout`.

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
  App.jsx                   # Routes: /login, /dashboard (AppShell) → index=Dashboard, fitness/=FitnessLayout
  index.css                 # Tailwind + slideFade keyframe + body gradient + scrollbar-hide + no number spinners
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
    AppShell.jsx            # Tab strip (Home/Fitness) + <Outlet />
    TabNav.jsx              # Sticky top nav — adapts light/dark based on active tab
    CategoryRow.jsx         # Label + animated pill + IndicatorDot
    DotButton.jsx           # 62x62 circle dot per task, fills on complete
    IndicatorDot.jsx        # 32px arrow (rotates on expand) / check (all complete)
    TaskItem.jsx            # Row in expanded list with staggered entrance animation
  fitness/
    FitnessLayout.jsx       # Dark theme container (bg-zinc-950) + overflow-x-hidden + <Outlet />
    hooks/
      useFitnessProgram.js  # Fetches active program (status='active')
      useTodaysPlan.js      # Fetches weekly plan for today + today's logs; returns weeklyPlan, dayPlan, isCompleted
    lib/
      date.js               # todayISO(), formatDayLabel()
      supabaseQueries.js    # fetchActiveProgram, fetchWeeklyPlanForDate (picks latest week_start on overlap),
                            # fetchWeeklyPlanByWeekStart, fetchWorkoutLogsForDate (selects all peloton metric cols),
                            # fetchWorkoutLogsForWeek, logWorkout, upsertWorkoutLog (insert first / update by id),
                            # updateWeeklyPlanDay (fetch-then-update single day in days JSONB)
    pages/
      Today.jsx             # Main fitness screen — branches by dayPlan.type:
                            #   lift → LiftingLogForm (inline, no nav)
                            #   rest/stretch → RestDayView (BigSection-style stretch checklist, saves on tick,
                            #                 SortableStretchList for drag-to-reorder, state restored from logs)
                            #   cardio → CardioDayView (Morning Stretch BigSection + Peloton BigSection,
                            #            inline inputs, 800ms debounce auto-save, state restored from logs,
                            #            fixed bottom-right spinner/checkmark save indicator)
                            # SaveIndicator component: fixed bottom-right, spinner while saving, ✓ when done
      LiftingLog.jsx        # Collapsible BigSection cards (Morning Stretch + Workout exercises).
                            # Exports: LiftingLogForm, BigSection, RIDE_TYPES, SortableStretchList.
                            # Exercises: drag-to-reorder via @dnd-kit (grip handle when collapsed), persists order.
                            # Stretch: SortableStretchList with drag-to-reorder, name-keyed checked state.
                            # Auto-saves on exercise collapse. No Finish button.
      PelotonLog.jsx        # Standalone Peloton log page at /dashboard/fitness/peloton (CP4, built).
                            # Cardio days now also log inline via CardioDayView — this page is secondary.
      WeekViewer.jsx        # Week view at /dashboard/fitness/week (CP5, built).
                            # Horizontal day strip with completion dots, expandable day cards,
                            # week navigation (prev/next). Uses useWeekPlan hook.
    components/
      SetRow.jsx            # Per-set input with custom ±5/±1 stepper buttons (no native spinners)
      MetricsBanner.jsx     # CP6: Friday weight prompt + 1st-of-month full measurements form.
                            # Shown at top of Today when conditions met. Saves to fitness_body_metrics.
      WorkoutCard.jsx       # Used for cardio day overview on Today (morning_stretch shown first)
      StretchChecklist.jsx  # Old-format stretch (exercises[] objects) — legacy, rarely hit
      MorningStretch.jsx    # Reusable morning stretch checklist (local state only, no save)
```

## Fitness Design Spec
- **Background:** `bg-zinc-950` (overrides body cream gradient)
- **Text:** `text-zinc-100`
- **Font:** `font-sans` (Inter)
- **Breakpoints:** mobile default, `md:` (768px) tablet — NO desktop layouts
- **Big sections:** `rounded-2xl border-2` cards, 68px header, `text-xl font-bold`
- **Exercise rows:** `rounded-xl border` inside BigSection, 52px header
- **Inputs:** `text-2xl font-bold`, `min-h-[56px]`, custom ±stepper buttons (`w-12`)
- **Completed state:** `border-emerald-600/700`, `text-emerald-400`, filled `bg-emerald-500` circle
- **Save indicator:** subtle `✓ Saved` / `Saving…` top-right, fades after 2s

## Household Design Spec
- **Background:** `linear-gradient(160deg, #F7F0E8 0%, #EDE4D8 60%, #E6DDD2 100%)`
- **Max width:** 520px centered
- **Fonts:** Cormorant Garamond (headings/labels, 300/400/500) + Inter (body/dots, 400/500/600)
- **Category colors:** Puppy `#C4724A` · Tasks `#7A6590` · Workouts `#4A8E72` · Plants `#6A9A42`

## What's Built (Fitness)
- **CP1–CP3:** Fitness scaffold, Today view (lift/rest/cardio/stretch), LiftingLogForm with auto-save
- **CP4:** PelotonLog.jsx at `/dashboard/fitness/peloton` + inline Peloton logging inside CardioDayView
- **CP5:** WeekViewer.jsx at `/dashboard/fitness/week` — horizontal strip + day expansion + week nav
- **CP6:** MetricsBanner.jsx — Friday weight prompt + 1st-of-month full measurement form
- **CP7:** Polish — retry handlers, 44px tap targets, timezone bug fixes, SPA 404 fix (vercel.json)
- **Drag-to-reorder:** exercises within a lift day, stretch moves in all day types; order persists to Supabase
- **Cardio inline logging:** no nav needed — BigSection cards for stretch + Peloton, auto-save, state restored on reload

## What's Not Built Yet (Household)
- Task creation / editing UI (tasks added via Supabase dashboard for now)
- Calendar events UI (table exists, no frontend)
- Plans UI (table exists, no frontend)
- Sign-up flow (not needed — manual user creation)
