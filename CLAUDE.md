# Household OS — Claude Reference

## Project Overview
Shared daily task dashboard for two people (Grant & Ishita). Tasks are grouped into four categories and displayed as animated pill rows. Changes sync live between both users via Supabase realtime.

A **Fitness tab** lives alongside the Home tab — dark gym-logbook aesthetic, mobile-first, single user (no per-user separation needed).

A **Puppy tab** also lives alongside — real-time puppy care logging (potty/meals/crate/walks/weight). Its own warm cream palette in day mode, plus a manual dark night mode. Big-tap-target card grid with live count-up timers, age-tuned amber/red thresholds, house-training rollup + 7-day trend. Two phones log concurrently via realtime.

## Local Setup
- **Path:** `/Users/ishitagupta/Documents/Claude/Household Dashboard`
- **Dev server (main):** Double-click `start-dev.command` → opens Safari at `http://localhost:5174`
- **Dev server (worktree):** Double-click `start-dev-worktree.command` → opens Safari at `http://localhost:5175`
- **Port:** 5174 main / 5175 worktree (5173 is used by a separate finance app)
- **Env vars:** Already in `.env.local` — do not commit this file. Must be copied into any new worktree.

## Stack
- React 18 + Vite 5
- Tailwind CSS 3 (custom color tokens: `puppy`, `tasks`, `workouts`, `plants`; plus the `pup.*` palette used by the Puppy tab — `pup.bg/card/ink/muted/line/accent/ok/amber/red` + `pup.night*`)
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

**Puppy (all have RLS enabled with `authenticated` select/insert/update/delete policies):**
- `puppy_profile` — id, name, dob, target_weight_lbs, vet_name, vet_phone, notes, created_at. Single row; `dob` drives the dynamic pee target.
- `puppy_events` — id, event_type (`puppy_event_type`), occurred_at (editable, for backdate), detail (JSONB), notes, created_at. `detail` conventions: pee/poop → `{ "location": "pad" | "street" | "indoor_accident" }` (indoor_accident = failure; pad/street = success); meal → `{ "grams": 45 }`; weight → `{ "lbs": 4.2 }`.
- `puppy_sessions` — id, session_type (`puppy_session_type`: crate | alone | walk), started_at, ended_at (null = in progress), alone (bool), notes, created_at. Partial unique index `puppy_sessions_one_open_per_type` enforces at most one open session per type. Crate, Alone, and Walk are all start/stop timers.
- `puppy_targets` — id, event_type (text), target_minutes (→ amber), overdue_minutes (→ red), active. Seeded: pee 90/120, poop 240/360, meal 240/300, crate 120/180, weight 10080/10080. Pee is overridden dynamically from age in the client (`~60 min per month of age`).

**Puppy views** (`security_invoker = true`, granted to `authenticated`):
- `v_puppy_status` — per tracked type: last occurrence, `elapsed_seconds`, `in_crate`, ok/amber/red `status` vs `puppy_targets`. Crate row uses open session (in crate) else last closed session's ended_at (out-of-crate nap timer). NOTE: the client computes live status/elapsed itself from raw last-events + targets (so cards tick without re-querying); this view is a server-side snapshot / debugging aid.
- `v_puppy_daily` — per LA-calendar day: pee_count, poop_count, accident_count, success_rate, meal_count, crate_minutes, alone_minutes, longest_alone_stretch.

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
- `puppy_event_type`: pee | poop | meal | walk | training | play | meds | vet | weight (walk is currently logged as a session, not an event)
- `puppy_session_type`: crate | alone | walk

### Realtime
Enable replication on `public.tasks` in Supabase Dashboard → Database → Replication for live cross-device sync to work. `puppy_events` and `puppy_sessions` were added to the `supabase_realtime` publication in the `create_puppy_tables` migration.

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
    recurrence.js           # appliesToday(rule, date) + mostRecentMatch(rule, from, to) — pure helpers
    categories.js           # CATEGORIES array [{key, label, color, addable}] — single source of truth.
                            # ADDABLE_CATEGORIES filters out workouts (driven by fitness program).
                            # Adding a new category here also requires ALTER TYPE task_category in Supabase.
  context/
    AuthContext.jsx         # session, user, signIn, signOut, loading
  hooks/
    useTodaysTasks.js       # Fetch + realtime + group by category + optimistic support.
                            # Task visibility rules (visibilityFor):
                            #   manual (no date, no recurrence) → always shows until checked off
                            #   dated → shows on due_date; rolls over day-to-day if overdue & uncompleted
                            #   recurring → shows on matching days; re-appears after next occurrence if
                            #               completed_at < today (local). Completed today → stays visible.
                            # Aged tasks get an aged_from ISO date (original missed day). Aged tasks sort
                            # to front (oldest first). Fetches 30-day lookback for overdue/missed items.
    useToggleTask.js        # Optimistic toggle of completed/completed_at
    useCreateTask.js        # Inserts a new task row into Supabase; returns { create, saving, error }
  pages/
    Login.jsx               # Email/password form, redirects to /dashboard
    Dashboard.jsx           # Header + 4 CategoryRows + AddTaskFab
  components/
    AppShell.jsx            # Tab strip (Home/Fitness/Puppy) + <Outlet />
    TabNav.jsx              # Sticky top nav — per-route theme (home light / fitness dark /
                            # puppy warm-cream, flips dark in puppy night mode via useNightMode()).
                            # Refresh button (window.location.reload) far-right, visible on all tabs.
    CategoryRow.jsx         # Label + animated pill + IndicatorDot.
                            # Pill click = expand/collapse. Dot/task clicks stop propagation so
                            # checking off a task never collapses the pill.
    DotButton.jsx           # 62x62 circle dot per task. Fills on complete.
                            # Aged (task.aged_from set, uncompleted): desaturated + dashed border.
    IndicatorDot.jsx        # 32px arrow (rotates on expand) / check (all complete)
    TaskItem.jsx            # Row in expanded list with staggered entrance animation.
                            # Aged tasks show a dark chip: 'yesterday' / 'from Tue' / '3d ago'.
    AddTaskFab.jsx          # Floating + button (fixed bottom-right, Home only). Manages modal open state.
    AddTaskModal.jsx        # Add-task form: category dropdown (Puppy/Tasks/Plants), title, assignee
                            # (Grant/Ishita/Both, default Both), No-date/Specific-date toggle,
                            # optional notes. Inserts via useCreateTask; realtime + refetch refresh dashboard.
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
                            # updateWeeklyPlanDay (fetch-then-update single day in days JSONB),
                            # chainedUpsert(promiseRef, logIdRef, payload) — serializes concurrent upserts
                            # through a promise chain so rapid taps can't race and create duplicate rows.
    pages/
      Today.jsx             # Main fitness screen — branches by dayPlan.type:
                            #   lift → LiftingLogForm (inline, no nav)
                            #   rest/stretch → StretchSection (BigSection-style checklist, saves on every
                            #                 toggle via chainedUpsert, SortableStretchList for drag-to-reorder,
                            #                 state restored from logs)
                            #   cardio → PelotonSection (Morning Stretch BigSection + Peloton BigSection,
                            #            inline inputs, 800ms debounce auto-save, state restored from logs)
                            # SaveIndicator component: fixed bottom-right, spinner while saving, ✓ when done
      LiftingLog.jsx        # Collapsible BigSection cards (Morning Stretch + Workout exercises).
                            # Exports: LiftingLogForm, BigSection, RIDE_TYPES, SortableStretchList.
                            # Exercises: drag-to-reorder via @dnd-kit (grip handle when collapsed), persists order.
                            # Stretch: SortableStretchList with drag-to-reorder, name-keyed checked state.
                            # Auto-saves 500ms after every reps/weight/duration change (useEffect debounce).
                            # Also saves on exercise collapse and on beforeunload/pagehide (flush).
                            # Uses chainedUpsert to prevent duplicate rows from rapid input.
      PelotonLog.jsx        # Standalone Peloton log page at /dashboard/fitness/peloton (CP4, built).
                            # Cardio days now also log inline via PelotonSection in Today — this page is secondary.
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
  puppy/
    PuppyLayout.jsx         # Warm-cream (or night dark) container; sets body bg by mode + <Outlet />
    lib/
      nightMode.js          # useNightMode() → [night, toggle]; localStorage-persisted, manual only,
                            # synced across components (TabNav + page) via a custom window event.
      date.js               # todayISO, formatElapsed (count-up label), formatClock, toDatetimeLocal, weekdayShort
      targets.js            # ageInMonths, dynamicPeeTarget (~60min/month), resolveTargets (seed + pee override),
                            # statusFor → ok|amber|red, progressFor → 0..1 ring fill, smartStatus → header line
      supabaseQueries.js    # fetchProfile/upsertProfile, fetchTargets, fetchLive (last-event-per-type +
                            # open sessions + last closed crate), logEvent, updateEvent (backdate), deleteEvent
                            # (undo), openSession/closeSession, fetchDaily (v_puppy_daily, N days)
    hooks/
      usePuppyLive.js       # profile + targets + live snapshot; realtime subscribe→refetch on
                            # puppy_events/puppy_sessions/puppy_profile (same pattern as useTodaysTasks)
      usePuppyDaily.js      # today rollup + 7-day trend from v_puppy_daily; refetches on changes
      useNow.js             # ticking clock (1s) driving live count-ups
    pages/
      Puppy.jsx             # Index. Ordered card grid (Pee/Poop/Meal/Crate/Alone/Walk/Weight). Tap = log
                            # (pee/poop → LocationChooser, weight → WeightSheet, session → open/close toggle).
                            # Long-press event card → DetailSheet. Header shows a smart status line
                            # (smartStatus). Successful potty (pad/street) fires a PawBurst (day mode).
                            # Below grid: single TodayCard. Night mode: only Pee/Poop/Crate, big cards, no TodayCard/prompt.
    components/
      PuppyCard.jsx         # Big tap target; pointer tap vs 500ms long-press. Emoji sits in a progress
                            # ring (ProgressRing) that fills toward the overdue point, green→amber→red,
                            # accent + full ring when a session is active, pulses when overdue.
      LocationChooser.jsx   # 3-button Pad/Street/Accident sheet; × / backdrop cancels (nothing logged)
                            # (crate/alone/walk sessions have no dedicated component — handled inline in Puppy.jsx)
      DetailSheet.jsx       # Edit time (backdate) / notes / delete an event
      WeightSheet.jsx       # Log a weight event ({ lbs }) — used by card + weekly prompt
      ProfileSheet.jsx      # Edit puppy_profile (name/dob/target wt/vet); dob drives dynamic pee target
      WeightPrompt.jsx      # Dismissible weekly weigh-in nudge (>7d old); per-day localStorage dismiss
      UndoSnackbar.jsx      # Persistent "Last: Pee, 2m ago — undo" → deleteEvent
      TodayCard.jsx         # Merged rollup + trend: big success %, icon-chip counts, 7-day bars (day only)
      PawBurst.jsx          # Paw-print celebration overlay (pawBurst keyframe); self-unmounts ~1s
      Sheet.jsx             # Shared bottom-sheet primitive (backdrop + rounded-top, day/night themed)
```

## Task Display Logic (Household Dashboard)
Tasks are shown based on three modes — determined at fetch time in `useTodaysTasks.js`:

| Mode | Condition | Behaviour |
|---|---|---|
| **Manual** | `due_date IS NULL`, `recurrence IS NULL` | Always visible until checked off. No aged_from. |
| **Dated** | `due_date` set | Shows on due_date; rolls over if overdue + uncompleted. `aged_from = due_date`. |
| **Recurring** | `recurrence` set | Shows on matching days. Resets per-occurrence via `completed_at < today`. Missed prior occurrences roll forward with `aged_from` set. Completed today → stays visible until midnight. |

**Aged tasks** (aged_from set): dot renders desaturated with a dashed border; expanded row shows a dark chip (`yesterday` / `from Tue` / `3d ago`). Aged tasks sort to the front of their category, oldest first.

**Add task UI:** floating `+` FAB (bottom-right, Home only) → modal with category (Puppy/Tasks/Plants), title, assignee, No-date/Specific-date toggle, optional notes. Workouts excluded from dropdown (that row is driven by the fitness program).

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
- **Add Task modal:** cream `#F7F0E8` card, `rounded-2xl`, `border-stone-200`, `shadow-2xl`

## Puppy Design Spec
- **Day background:** `#FBF4EA` (warm cream). **Night background:** `#161210` (warm near-black).
- **Palette tokens (`pup.*`):** `accent #E0894B`, `ink #4A3B30`, `muted #A0917F`, `line #EADFD1`,
  `ok #7BA86A`, `amber #E0A23B`, `red #D8664A`; night: `nightbg/nightcard/nightink/nightline`.
- **Cards:** `rounded-2xl border-2`, min-h 120px (140px in night mode). Emoji sits inside a progress
  ring (SVG, ~56px / 64px in night) that fills toward the overdue point and colors ok/amber/red;
  active session = full accent ring; overdue = `pupPulse` animation. Status border reinforces the ring.
  500ms long-press opens the detail sheet.
- **Header:** serif name + a muted smart status line (`smartStatus`) surfacing the most urgent thing.
- **Celebration:** `PawBurst` (6 `🐾` via `pawBurst` keyframe) on a successful potty; day mode only.
- **Today card:** single `rounded-2xl` card — big success % (ok/amber/red), icon-chip counts, 7-day bars.
- **Night mode:** manual toggle (☀️/🌙 in header), persisted in `localStorage['puppy-night-mode']`,
  never auto-switches on system theme. Shows only Pee/Poop/Crate, no Today card / prompt.

## What's Built (Puppy)
- **Realtime care log:** tap-to-log card grid (Pee/Poop/Meal/Crate/Alone/Walk/Weight); two phones sync live.
- **Potty flow:** pee/poop tap → Pad/Street/Accident chooser (× cancels — nothing logged). Accidents feed success rate.
- **Sessions:** crate/alone/walk toggle (first tap opens, second closes), live elapsed; DB enforces one open per type.
- **Timers:** minute granularity everywhere except the Alone card (seconds).
- **Live timers + progress rings:** cards count up since last event; a ring around the emoji fills
  green→amber→red toward age-tuned thresholds (pee = ~60min/month of age from `puppy_profile.dob`;
  others from `puppy_targets`) and pulses when overdue. Active sessions show a full accent ring.
- **Smart header line:** one contextual sentence ("Next pee in ~20m" / "On a walk — 12m in 🐾").
- **Win celebration:** a paw-print burst plays when a successful potty (pad/street) is logged (day mode).
- **Undo:** persistent "Last: X, Nm ago — undo" snackbar deletes the last logged event.
- **Backdate/edit:** long-press an event card → edit time/notes or delete.
- **Today card:** one merged card — big potty-success %, icon-chip counts, 7-day success-rate bars.
- **Weekly weigh-in nudge:** dismissible banner when latest weight is >7 days old.
- **Profile editor:** in-app sheet for name/DOB/target weight/vet (no seeding — user fills it in).
- **Night mode:** manual, persisted, stripped-down dark view for 3am potty runs.

## What's Built (Fitness)
- **CP1–CP3:** Fitness scaffold, Today view (lift/rest/cardio/stretch), LiftingLogForm with auto-save
- **CP4:** PelotonLog.jsx at `/dashboard/fitness/peloton` + inline Peloton logging inside Today
- **CP5:** WeekViewer.jsx at `/dashboard/fitness/week` — horizontal strip + day expansion + week nav
- **CP6:** MetricsBanner.jsx — Friday weight prompt + 1st-of-month full measurement form
- **CP7:** Polish — retry handlers, 44px tap targets, timezone bug fixes, SPA 404 fix (vercel.json)
- **Drag-to-reorder:** exercises within a lift day, stretch moves in all day types; order persists to Supabase
- **Cardio inline logging:** BigSection cards for stretch + Peloton, auto-save, state restored on reload
- **Save reliability:** LiftingLog debounce-saves on every reps/weight change (500ms) + flush on collapse/unload; Stretch saves on every toggle including unchecks; chainedUpsert prevents duplicate rows from rapid input

## What's Built (Household)
- **Task rollover:** manual/dated/recurring tasks persist and roll over day-to-day until checked off
- **Aged task styling:** desaturated dashed dot + "yesterday / from Tue / 3d ago" chip in expanded row
- **Refresh button:** persistent ↺ icon far-right of TabNav, both Home and Fitness (`window.location.reload`)
- **Add Task UI:** floating + FAB → modal (category, title, assignee, date toggle, notes) → inserts to Supabase

## What's Not Built Yet (Household)
- Task editing / deletion UI (edit via Supabase dashboard for now)
- Calendar events UI (table exists, no frontend)
- Plans UI (table exists, no frontend)
- Sign-up flow (not needed — manual user creation)
