# Household OS — Claude Reference

## Project Overview
Shared daily task dashboard for two people (Grant & Ishita). Tasks are grouped into four categories and displayed as animated pill rows. Changes sync live between both users via Supabase realtime.

A **Fitness tab** lives alongside the Home tab — dark gym-logbook aesthetic, mobile-first, single user (no per-user separation needed).

A **Puppy tab** also lives alongside — real-time puppy care logging (potty/food/crate/walks/weight). It is the **default landing tab** (`/dashboard` redirects to it; Home moved to `/dashboard/home`). Its own warm cream palette in day mode, plus a dark night mode that switches automatically on the device clock (22:00–06:00). Full-width tap tiles with live count-up timers, age-tuned amber/red thresholds, a swipeable sleep/day-timeline pager, house-training rollup + 7-day trend. Two phones log concurrently via realtime.

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
- `puppy_events` — id, event_type (`puppy_event_type`), occurred_at (editable, for backdate), detail (JSONB), notes, created_at. `detail` conventions: pee/poop → `{ "location": "pad" | "street" | "indoor_accident" }` (indoor_accident = failure; pad/street = success); food is a **bowl with a running level** — `meal` = food went down `{ "added_cups": 0.25, "left_pct": 10, "bowl_cups": 0.275 }`, `food_check` = a reading `{ "left_pct": 50, "bowl_cups": 0.1375 }` (plus `"removed": true` when the bowl was picked up rather than eaten); weight → `{ "lbs": 4.2 }`. **`left_pct` is read against the FULL MARK** — the level right after food last went down — so "¼ cup, then 50% left, then 10% left" is 0.25 → 0.125 → 0.025, not compounded. `bowl_cups` is absolute and computed at write time, which is what lets one row be edited or deleted without corrupting the rest of the chain. Legacy meals `{ "made_cups", "ate_pct" }` (and older `{ "grams" }`) are still read via a compat branch in `normalizeFoodRow`; nothing was backfilled.
- `puppy_sessions` — id, session_type (`puppy_session_type`: crate | alone | walk), started_at, ended_at (null = in progress), alone (bool), notes, created_at. Partial unique index `puppy_sessions_one_open_per_type` enforces at most one open session per type. Crate, Alone, and Walk are all start/stop timers.
- `puppy_targets` — id, event_type (text), target_minutes (→ amber), overdue_minutes (→ red), active. Seeded: pee 90/120, poop 240/360, meal 240/300, crate 120/180, weight 10080/10080. **`weight` is `active = false`** — the Weight tile shows the last logged value, never a countdown. `walk`/`alone`/`vomit` have no rows at all (also no counters). Pee is overridden dynamically from age in the client (fractional age × ~60 min/month — smooth ramp, clamped 45–240 min).

**Puppy views** (`security_invoker = true`, granted to `authenticated`):
- `v_puppy_status` — per tracked type: last occurrence, `elapsed_seconds`, `in_crate`, ok/amber/red `status` vs `puppy_targets`. Crate row uses open session (in crate) else last closed session's ended_at (out-of-crate nap timer). NOTE: the client computes live status/elapsed itself from raw last-events + targets (so cards tick without re-querying); this view is a server-side snapshot / debugging aid.
- `v_puppy_daily` — per LA-calendar day: pee_count, poop_count, accident_count, success_rate, meal_count, crate_minutes, alone_minutes, longest_alone_stretch, **pee_accident_count, poop_accident_count** (the accident split TodayCard reads; appended by `add_potty_accident_split_to_v_puppy_daily` — CREATE OR REPLACE VIEW can only add columns at the END, so any future column goes after these).

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
- `puppy_event_type`: pee | poop | meal | food_check | walk | training | play | meds | vet | weight | vomit (`meal` now means "a serving went down", so `v_puppy_daily.meal_count` counts servings and `food_check` rows never inflate it) (walk is logged as a **session**, not an event — 3 historical `walk` event rows from 2026-07-20 are left in place but nothing writes new ones). `vomit` (added by `add_vomit_to_puppy_event_type`) carries **no detail at all** — the timestamp is the whole entry — and has no `puppy_targets` row, so it never counts down.
- `puppy_session_type`: crate | alone | walk

### Realtime
Enable replication on `public.tasks` in Supabase Dashboard → Database → Replication for live cross-device sync to work. `puppy_events` and `puppy_sessions` were added to the `supabase_realtime` publication in the `create_puppy_tables` migration; `puppy_profile` was added later (`add_puppy_profile_to_realtime_publication`).

⚠️ **A postgres_changes channel that names an unpublished table silently delivers NOTHING while still reporting `SUBSCRIBED`.** `usePuppyLive` binds all three puppy tables on one channel, so while `puppy_profile` was missing from the publication the whole Poppy tile grid never updated from the other phone — the day timeline kept working only because `usePuppyDay` binds just the two published tables. If live sync ever dies again, check the publication before anything else.

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
  App.jsx                   # Routes: /login, /dashboard (AppShell) → index redirects to puppy/ (default tab),
                            # home/=Dashboard, fitness/=FitnessLayout, puppy/=PuppyLayout
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
    Login.jsx               # Email/password form, redirects to /dashboard (→ Poppy)
    Dashboard.jsx           # Header + 4 CategoryRows + AddTaskFab
  components/
    AppShell.jsx            # Tab strip (Home/Fitness/Poppy) + <Outlet />
    TabNav.jsx              # Sticky top nav — per-route theme (home light / fitness dark /
                            # puppy warm-cream, flips dark in puppy night mode via useNightMode()).
                            # Home links to /dashboard/home (no `end` prop — index redirects to puppy).
                            # NOTE: the puppy tab is LABELED "Poppy" (the dog's name); route/module stay `puppy`.
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
      nightMode.js          # useNightMode() → [night, toggle]. AUTOMATIC on the device clock:
                            # on 22:00, off 06:00 (isNightHour: h >= 22 || h < 6). The ☀️/🌙 button
                            # writes a per-period override to localStorage['puppy-night-override']
                            # ({ period, value }) that self-clears at the next boundary — periodKey
                            # buckets 10pm→6am under the *previous* date so an override set at 11pm
                            # lasts till 6am. Re-checks on a 30s interval + focus + visibilitychange,
                            # synced across components (TabNav + page) via a custom window event.
      date.js               # todayISO, formatElapsed (count-up label), formatClock, formatClockShort
                            # ("3:04a" — timeline pills only, where width is the constraint),
                            # toDatetimeLocal, weekdayShort, shortDate ("9/1", trend bar labels),
                            # monthDay ("Aug 18", trend week header), shiftDays (local-time day
                            # arithmetic on a YYYY-MM-DD — a raw 86_400_000ms step is an hour off
                            # across DST)
      targets.js            # ageInMonths (whole, for display) + ageInMonthsFractional (days/30.44, drives pee
                            # target), dynamicPeeTarget (fractional ~60min/month, clamp 45–240), resolveTargets
                            # (seed + pee override), statusFor → ok|amber|red, progressFor → 0..1 ring,
                            # smartStatus(live, resolved, now, bowl) → header. Food sits out the urgency
                            # race while the bowl isn't empty ("next food in ~2h" is nonsense with food
                            # right there); a pee that's actually due still outranks the bowl.
      crate.js              # endCrateForPotty(openCrate, atISO) — a potty ends the crate session she's
                            # in, at the EVENT's time (so a backdated pee ends it back there). During
                            # night hours (isNightHour — the clock, 22:00–06:00, NOT the ☀️/🌙
                            # override) it immediately opens a fresh session at that same instant, so
                            # each row is one clean "she lasted N hours" stretch instead of one 8-hour
                            # block hiding four wake-ups. No-ops when nothing is open, or when the
                            # backdate lands before the session started (that would write an
                            # end-before-start row).
      growth.js             # THE GROWTH MODEL — the one place "how big will she get" lives.
                            # GROWTH_ANCHORS = fraction-of-adult-weight by age in months (small breed,
                            # done at ADULT_AGE_MONTHS = 12), interpolated by growthFraction.
                            # estimateAdult(rows, dob, targetLbs) → { low, mid, high, from }: divides
                            # each logged weight by the fraction for its age, recency-weights the
                            # results, and spreads ±15% (widened to cover the points). Falls back to
                            # profile.target_weight_lbs ±15% under 2 usable logs. target_weight_lbs is
                            # deliberately NOT blended into the estimate — it's drawn as its own goal
                            # line, which is the only way the chart can say she's tracking above it.
                            # bandSamples() samples the band for the SVG. CHART_DOMAIN_MONTHS = 18 so
                            # the curve visibly flattens past adulthood.
      food.js               # THE BOWL MODEL — the one place food math lives. SCOOP_CUPS (0.25) +
                            # DAILY_SCOOP_TARGET (3) define the day's goal; scoops are counted by
                            # VOLUME (putDownCups / 0.25), so a 1/2-cup pour reads as 2 scoops, not 1.
                            # formatScoops shows whole numbers cleanly and "2.4" for an odd pour.
                            # normalizeFoodRow (single
                            # shape for meal / food_check / legacy rows), foodRowsAsc, bowlState →
                            # { hasFood, level, fullLevel, leftPct, lastDown, downAt }, fullLevelBefore
                            # (the mark a given row was written against — edits re-base on this, NOT on
                            # bowlState, which already includes the row), foodDayTotals → { putDownCups,
                            # servings, eatenCups, leftCups }, levelAfterCheck/levelAfterDown,
                            # logFoodDown/logFoodCheck/foodDetailPatch, formatCups, foodSummary.
      sleep.js              # buildSleepDay(sessions, nowMs) — asleep(=in crate)/awake breakdown for today,
                            # 10-min segments merged into runs over a fixed 24h track (resets at local midnight).
                            # clipSessionsToDay(sessions, type, dayStartMs, dayEndMs, openEndMs) — sessions of
                            # one type as minute offsets in a day window, 1:1 with rows (DayTimeline taps).
      supabaseQueries.js    # fetchProfile/upsertProfile, fetchTargets, fetchLive (last-event-per-type +
                            # open sessions + lastSessionByType + last closed crate + raw events/sessions
                            # arrays for the sleep bar & food chain), logEvent (accepts occurredAt for
                            # backdating), updateEvent, deleteEvent, openSession/closeSession,
                            # closeSessionAt(id, endedAt) — conditional close (`.is('ended_at', null)`)
                            # so a stale snapshot can't stretch a session the other phone already ended,
                            # logSession (backdated start + optional end), updateSession, deleteSession,
                            # fetchDailyRange(fromISO, toISO) (v_puppy_daily over a DATE RANGE — days with
                            # no events have no row, so a LIMIT can't say which days it covered),
                            # fetchDayTimeline(dayISO) — date-ranged
                            # events + overlapping sessions for one local day (fetchLive's 100/200 row
                            # caps make it unusable for history)
    hooks/
      usePuppyLive.js       # profile + targets + live snapshot; realtime subscribe→refetch on
                            # puppy_events/puppy_sessions/puppy_profile (same pattern as useTodaysTasks)
      usePuppyDaily.js      # the last N calendar days of v_puppy_daily rollups (default 84 = the 12
                            # weeks TodayCard can scroll back), oldest → newest; refetches on changes.
                            # One query covers every week the strip reaches — paging never re-fetches.
      useWeightHistory.js   # every weight event, oldest → newest (fetchWeightHistory — no limit;
                            # weekly weigh-ins are a few dozen rows) + realtime subscribe→refetch
      usePuppyDay.js        # one local day's events + sessions (fetchDayTimeline) + realtime
                            # subscribe→refetch — powers DayTimeline for today and past days
      useNow.js             # ticking clock (1s) driving live count-ups
      useLongPress.js       # tap + long-press handler props (500ms, 16px move tolerance,
                            # suppressClick, pointercancel clear), shared by PuppyCard and the
                            # TodayCard day bars. TAP IS onClick, long-press is pointer-timer driven —
                            # never the reverse; see the PuppyCard note below for why.
    pages/
      Puppy.jsx             # Index. CARDS entries carry `slot` (full | small | wide), `nightVisible`,
                            # `noTimer`, `simple` and `hidden` — layout is derived from those, not
                            # hardcoded. `simple` = an event with no detail to collect (Vomit), so a tap
                            # logs it outright and LogSheet shows a bare time field + one button.
                            # THE WHOLE TAB IS A PAGER (day mode): the header sits outside PuppyPager and
                            # stays put; everything else is page 1 and swipes away to reveal DayTimeline
                            # as page 2. Owns `dayISO` for the timeline + a ref on PuppyPager so a
                            # long-pressed day in TodayCard sets the day AND jumps to page 2.
                            # doLog() runs endCrateForPotty after a pee/poop (its own try — the event
                            # is already written, so a crate failure must not read as a failed log).
                            # Page 1 order: WeightPrompt → Pee/Poop/Food/Crate full-width stacked (big
                            # sizing) → Walk + Vomit half-width → SleepCard → Age (wide) → Weight (wide)
                            # → FoodCard → TodayCard. Alone is defined but `hidden: true` (one-line restore).
                            # THREE pager pages now: page 1, DayTimeline, WeightChart.
                            # The AGE card is `kind: 'info'` and logs nothing, but it does take both
                            # gestures: TAP flips age ⇄ birthday (state only, so a reload is always back
                            # on age), LONG-PRESS opens ProfileSheet. Both are routed explicitly at the
                            # top of handleTap/handleLongPress — falling through would hand an `info`
                            # card to LogSheet, which renders an empty shell for it.
                            # Tap = log (pee/poop → LocationChooser, food → FoodSheet, weight → WeightSheet,
                            # session → open/close toggle, vomit → straight to doLog). Long-press any card
                            # → LogSheet (backdate + edit/delete).
                            # Header shows a smart status line (smartStatus). Successful potty (pad/street) fires a
                            # PawBurst (day mode).
                            # Night mode: only Pee/Poop/Crate, big cards, no bottom cards/prompt.
    components/
      PuppyCard.jsx         # Big tap target; plain onClick tap vs 500ms long-press. Emoji sits in a progress
                            # ring (ProgressRing) that fills toward the overdue point, green→amber→red,
                            # accent + full ring when a session is active, pulses when overdue.
                            # Variants: `big` (min-h 140, ring 64, text-4xl), `wide` (short horizontal
                            # row, min-h 84 — ring+label left, value right). `primary={null}` renders no
                            # number at all (Walk/Alone idle, Weight). NOTE the `wide` variant renders
                            # `unit` NOWHERE — a wide card wanting one folds it into `primary` (the Age
                            # card's "12 weeks"). cardView may also return `label` to override the
                            # card's own (Age → "Birthday" when flipped).
                            # TAP IS onClick, NOT pointerup — the cards live inside PuppyPager's snap
                            # scroller and iOS Safari fires pointercancel for touches there, which silently
                            # killed a pointerup-synthesized tap everywhere but a pinpoint press (the old
                            # "only the emoji is tappable" bug). Pointer events now only run the long-press
                            # timer: cleared on pointermove >16px, pointercancel, pointerup, pointerleave.
                            # A `suppressClick` ref swallows the click that trails a fired long-press.
      LocationChooser.jsx   # 3-button Pad/Street/Accident sheet; × / backdrop cancels (nothing logged).
                            # Exports LocationButtons (the shared button group) + LOCATION_OPTIONS.
      LogSheet.jsx          # Takes `openCrate` (the open CRATE session, whatever card it is) so a
                            # backdated potty ends the crate at the backdated time via endCrateForPotty.
                            # Long-press sheet. EVENTS: top logs a NEW backdated entry at a chosen time
                            # (potty uses LocationButtons; food = LeftPctField + CupsField with separate
                            # Log-check / Put-food-down buttons, amounts of the most recent food row now
                            # editable via foodDetailPatch + fullLevelBefore; weight lbs);
                            # bottom edits time/notes of the most recent entry, or deletes it.
                            # SESSIONS (crate/walk) are STATE-AWARE: if one is open the sheet leads with
                            # "In crate since 3:04 PM · 1h 20m", then Came-out-at (prefilled now) → End,
                            # then Fix-the-start-time, then a collapsed "add an earlier one" (must be
                            # closed — one open per type). If none is open it's Went-in/Came-out prefilled
                            # 1h-ago/now with a "she's still in there" toggle that inserts it open.
                            # RelativeChips ("30m ago"/"1h ago"/"Now") write into the TimeField beside
                            # them; all time entry goes through TimeField (time big, date behind a chip). rangeError() validates end>start and rejects future times. The
                            # most-recent edit/delete block is hidden for sessions while one is open.
      WeightSheet.jsx       # Log a weight event ({ lbs }) — used by card + weekly prompt
      FoodSheet.jsx         # Tap-Food sheet, STATE-AWARE like LogSheet is for an open crate session.
                            # Food in the bowl → an accent banner ("¼ cup down at 8:12a · about 0.12
                            # cups left"), then "How much is left?" (Empty chip pinned outside a 100→0
                            # scroller, opening on the LAST reading) → Save check; below a divider, a
                            # collapsed "+ Put more food down" that expands to cup chips and REUSES the
                            # left-% already chosen above, echoing it back ("1/4 cup onto 10% left →
                            # 0.28 cups in the bowl"). Plus a muted "picked it up (she didn't eat it)"
                            # link → { removed: true }. Empty bowl → skips the question entirely, just
                            # cups + Put food down. Exports LeftPctField / CupsField / AddPreview
                            # (shared with LogSheet) and the button classes. Surfaces save errors —
                            # the old MealSheet swallowed them, so a failed log looked like a no-op.
      Chips.jsx             # chipCls + the generic Chips row lifted out of the old MealSheet (TimeField
                            # and LogSheet's RelativeChips both import chipCls). The scrolling variant
                            # keeps overscroll-x-contain (a fling must not drag PuppyPager) and now
                            # scrolls its selected chip into view on mount — the left-% row opens on the
                            # last reading, not on the first option.
      ProfileSheet.jsx      # Edit puppy_profile (name/dob/target wt/vet); dob drives dynamic pee target
      WeightPrompt.jsx      # Dismissible weekly weigh-in nudge (>7d old); per-day localStorage dismiss
      UndoSnackbar.jsx      # Persistent "Last: Pee, 2m ago — undo" → deleteEvent
      SleepCard.jsx         # Asleep(=in crate)/awake totals + fixed 24h track bar (dark/light blue, now marker)
      PuppyPager.jsx        # Generic N-page horizontal pager for the WHOLE tab (CSS scroll-snap, no
                            # library): takes `labels` + one child per page (3 today: cards, timeline,
                            # weight). The ‹ / › buttons name the ADJACENT page (labels[index∓1]), not
                            # the two ends — both are disabled at the ends so the lookup can't run off. Full-bleed via -mx-4/md:-mx-6 with
                            # px-4 re-applied per page (cancels PuppyLayout's padding). Container takes the
                            # ACTIVE page's height with transition-[height] (the pages differ ~2x, so lerping
                            # would drag content under your finger) and scrolls the window to the pager top on
                            # page change. Labelled ‹ / › buttons + dots below as a backup for non-touch.
                            # Owns page index/scroll — Puppy.jsx re-renders every 1s from useNow, keep it out.
                            # forwardRef exposes { goTo(i) } so TodayCard's "view timeline" can jump to page 2.
      DayTimeline.jsx       # Vertical 24h track (720px = 1440min) for one day: awake fill + crate sessions as
                            # dark-blue bands (square edges — they're time spans), "now" line on today.
                            # 💧/💩 pills mirror each other either side of the track, each on a leader line
                            # back to the exact minute; accidents turn the pill red. 🤮 VOMIT SHARES THE
                            # POOP (right) LANE and is always red — the four lanes already spend the whole
                            # half-width, and a vomit is rare enough that a same-minute collision with a
                            # poop is a fair trade. PILL_EMOJI is the list of what gets a pill. FOOD IS THE OUTERMOST
                            # LEFT LANE (outboard of pee): 🍽️+time in accent for a serving going down, a
                            # bare "50%" in muted for a reading — there isn't lane width for two
                            # emoji+time pills, and the weight difference matches the meaning. Unlike
                            # every other lane it is pinned to the CARD EDGE (left-0) and grows inward,
                            # its leader flex-1 to fill the gap: that keeps it off the hour-guide labels
                            # in the left gutter and makes the lane self-sizing. Food pills render BEFORE
                            # the pee/poop pills so those opaque pills occlude the long food leader.
                            # WALKS ARE DRAWN ON THE
                            # MAIN TRACK in accent (after the crate bands, so a walk wins an overlap), with
                            # their own leader from the walk's midpoint out to a minutes-only pill — same
                            # grammar as pee/poop. Walk pills render BEFORE the pee/poop pills so those
                            # opaque pills occlude the hairline passing behind them.
                            # Column offsets (TRACK_W/LEADER/WALK_LANE_X) are MEASURED, at 375px where the
                            # half-width is 159: pee/poop pills 26→91, walk pill 99→137, food pill pinned
                            # at the card edge and ≤60px wide (8px clear of pee; 15px at 390px).
                            # Re-measure in the browser before growing any of them. Tap anything →
                            # TimelineEditSheet. Day <select> (last 14 days, Today/Yesterday/…), defaults
                            # today; a day arriving from TodayCard that's older than 14 days is folded
                            # into the options, or the select would render blank.
      TimeField.jsx         # Time-first replacement for <input type="datetime-local"> — same value
                            # contract (local 'YYYY-MM-DDTHH:mm', '' = blank/still-running) so callers
                            # still hand it to new Date(). Big <input type="time"> + a compact
                            # "Today ▾/Yesterday ▾/Aug 17 ▾" button that expands to Today/Yesterday
                            # chips + a date input. Reason: iOS opens a whole calendar for
                            # datetime-local, but nearly every edit is "slide it back an hour today".
                            # Used by every time field in LogSheet and TimelineEditSheet.
      TimelineEditSheet.jsx # Retime or delete one timeline entry (labels 'Food down'/'Food check', with
                            # foodSummary in the subtitle) — events → updateEvent/deleteEvent,
                            # sessions → updateSession/deleteSession (delete removes start+end together).
      WeightChart.jsx       # Page 3 of the pager. Hand-rolled SVG (no chart library in the project):
                            # her logged weights as an ink line + dots over the projected growth band
                            # (accent fill + dashed mid), a dashed green goal line, and a "today" rule.
                            # Range chips Life/3mo/6mo/1y/All; the domain runs birth → birth+18mo, so a
                            # range longer than her life reaches into the FUTURE and shows where the
                            # band lands. Default = 1y, except under a year old → her whole life
                            # (birth→today), which is the only window where every point is on screen.
                            # Drag pans within the domain: the wrapper is `touch-action: pan-y`, which
                            # keeps vertical page scroll but claims horizontal gestures from
                            # PuppyPager's snap scroller (so swiping back from this page means the
                            # ‹ button, by design). The goal line is skipped when it's off-scale —
                            # on the birth→today view an adult target would flatten her real data.
                            # Takes NO `now` prop: Puppy.jsx re-renders every second and nothing here
                            # changes faster than daily, so today is resolved once per mount.
      FoodCard.jsx          # Today's food, from foodDayTotals: hero = cups PUT DOWN (the number that's
                            # actually known), with servings · ~eaten · what's left beside it
      TodayCard.jsx         # Potty history (day only). Top: the SELECTED day's success % + two pill
                            # rows — 💧 pees / ⚠️ pee accidents, 💩 poops / ⚠️ poop accidents (no food;
                            # FoodCard sits right above it). Bottom: 12 rolling 7-day panes in a
                            # snap-x scroller (overscroll-x-contain, or a fling chains out to
                            # PuppyPager) opening scrolled to the far right = this week, which is also
                            # why a reload resets to it; ‹ › arrows scrollBy one pane. Every bar is a
                            # button: tap selects the day (stats above swap), long-press → a Sheet
                            # offering "View timeline" → onOpenTimeline(day). Labels are weekday over
                            # M/D.
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
  `ok #7BA86A`, `amber #E0A23B`, `red #D8664A`, `sleep #2B4C7E` (dark blue), `awake #AFCDEC` (light blue);
  night: `nightbg/nightcard/nightink/nightline`.
- **Cards:** `rounded-2xl border-2`. Three sizes: `big` (min-h 140px, ring 64px — the four full-width
  tiles and all night cards), default (min-h 120px, ring 56px — Walk), `wide` (min-h 84px horizontal
  row, ring 44px — Weight). Emoji sits inside a progress ring (SVG) that fills toward the overdue point
  and colors ok/amber/red; active session = full accent ring; overdue = `pupPulse` animation. Status
  border reinforces the ring. 500ms long-press opens the detail sheet.
- **Tile order (day):** Pee → Poop → Food → Crate full-width stacked, then Walk + Vomit at half width;
  below them SleepCard → Age (wide) → Weight (wide) → Food → Today. Walk/Alone/Weight show no idle
  counter; Vomit shows today's COUNT rather than a timer (there's no target to be due against).
  All of that is page 1 of a three-page tab-wide pager (cards → timeline → weight); the header sits
  above it and doesn't move.
- **Timeline:** vertical 24h track (square-edged spans), `pup.sleep`/`pup.awake` fill matching the bar.
  💧 left / 💩 right as mirrored pills on `pup.line` leader lines; accidents turn the pill `pup.red`.
  `pup.accent` walks drawn on the track itself, with a leader out to a minutes-only pill. 🤮 vomit
  rides the poop lane, always in `pup.red`. Food is the
  outermost left lane, pinned to the card edge: 🍽️+time in `pup.accent` for a serving, a bare `50%`
  in `pup.muted` for a reading, both on long leaders that pass *behind* the pee pills.
- **Header:** serif name + a muted smart status line (`smartStatus`) surfacing the most urgent thing.
- **Celebration:** `PawBurst` (6 `🐾` via `pawBurst` keyframe) on a successful potty; day mode only.
- **Food tile, two states:** food in the bowl → accent/active, `50%`, "¼ cup at 8:12a · tap to
  update". Bowl empty → **`2 of 3` / "scoops today" / "9h 53m since last"** — the ring fills with the
  day's scoop progress while the border/text colour still comes from the time-since-last meal target,
  so ring length answers "how much has she had today" and colour answers "is she due". There is no
  countdown or "Overdue!" wording on this tile; the elapsed time is stated plainly instead.
- **Food card:** hero is cups **put down** today (what's actually known), with servings · ~eaten ·
  what's left beside it.
- **Potty card (TodayCard):** single `rounded-2xl` card — the selected day's big success %
  (ok/amber/red), two pill rows (pee + pee accidents, poop + poop accidents), and a week-by-week bar
  strip. Selected bar takes `ring-2 ring-pup-accent`; its labels go bold ink.
- **Night mode:** automatic on the device clock — on at 22:00, off at 06:00. The ☀️/🌙 header button
  overrides it for the current period only (`localStorage['puppy-night-override']`), then it reverts to
  automatic. Never keys off system theme. Shows only Pee/Poop/Crate, no bottom cards / prompt.

## What's Built (Puppy)
- **Default tab:** the app lands on Poppy — `/dashboard` redirects to `/dashboard/puppy`, Home is `/dashboard/home`.
- **Realtime care log:** tap-to-log tiles (Pee/Poop/Food/Crate full-width, Walk + Vomit small, Age and
  Weight wide); two phones sync live. Alone is defined but hidden.
- **Vomit log:** a tap logs it outright — no location question, no detail at all. The tile reads
  today's count ("2 / today / last at 3:42 PM"); long-press backdates or edits/deletes the last one,
  same sheet as everything else. Shows on the day timeline as a red 🤮 pill in the poop lane. Not in
  the night view, and deliberately absent from the potty success rate — it isn't a potty.
- **Age card:** a short wide row directly above Weight. Tap flips it between her age ("12 weeks /
  12w 1d") and her birthday ("Jun 13 / born Sat · 2026"); a reload always comes back on the age.
  Long-press opens the profile, which is where the birthday is actually set.
- **Weight & growth chart:** a third pager page after the timeline. Her logged weights over a
  projected growth band (upper/lower estimate of the adult dog, derived from her own weigh-ins, with
  the profile's target drawn separately as a goal line). Range chips Life/3mo/6mo/1y/All; anything
  longer than her life so far reaches into the future so you can see where the band lands. Defaults
  to a year, or her whole life while she's under one. Drag the chart to pan through the domain
  (birth → 18 months) — that gesture wins over the pager's swipe on this page, by design.
- **Potty flow:** pee/poop tap → Pad/Street/Accident chooser (× cancels — nothing logged). Accidents feed success rate.
- **Sessions:** crate/alone/walk toggle (first tap opens, second closes), live elapsed; DB enforces one open per type.
- **Timers:** minute granularity everywhere except the Alone card (seconds). Walk, Alone and Weight
  show **no idle counter or ring** — blank until a session starts, then a live count-up.
- **Live timers + progress rings:** cards count up since last event; a ring around the emoji fills
  green→amber→red toward age-tuned thresholds (pee = fractional age × ~60min/month from `puppy_profile.dob`;
  others from `puppy_targets`) and pulses when overdue. Active sessions show a full accent ring.
- **Smart header line:** one contextual sentence ("Next pee in ~20m" / "On a walk — 12m in 🐾").
- **Win celebration:** a paw-print burst plays when a successful potty (pad/street) is logged (day mode).
- **Undo:** persistent "Last: X, Nm ago — undo" snackbar deletes the last logged event.
- **Backdate/edit (LogSheet):** long-press any card → log a new entry at a chosen past time (potty picks
  Pad/Street/Accident) and/or edit-time/delete the most recent entry.
- **Crate/walk back-logging is state-aware:** the sheet says whether she's in there right now — open
  session → end-time field first (prefilled now, "Now/15m ago/30m ago" chips) plus a fix-the-start-time
  field; nothing open → Went-in/Came-out prefilled 1h-ago/now with a "still in there" toggle. End-before-
  start and future times are rejected inline.
- **Card taps are click-driven:** the whole card is tappable on iOS, not just the emoji (see PuppyCard —
  a pointerup-synthesized tap was being cancelled by the snap scroller).
- **Sleep tracker:** asleep(=in crate)/awake totals for the day + a fixed 24h bar that fills dark-blue
  (asleep) / light-blue (awake) in 10-min segments, growing to a "now" marker; resets at local midnight.
- **Day timeline:** swipe the **whole tab** left (the header stays pinned, everything else slides away)
  for a full-page vertical 24h track — asleep/awake fill, pee/poop pills mirrored either side on leader
  lines back to the exact minute, and walks in orange on the track with a leader to a minutes pill.
  Tap any of them to retime or delete it. Live for today via realtime; a day dropdown
  (last 14 days) scopes it to any past day. Labelled ‹ / › buttons under the pager as a non-touch backup.
- **Food logging is a bowl, not a meal:** you log *putting food down* and *how much is left*, whenever
  you happen to notice — no waiting around for her to finish. Tapping Food is state-aware: bowl empty →
  just pick cups; food down → "How much is left?" (Empty + a 100→0 scroller opening on the last
  reading) with **+ Put more food down** below it reusing that same answer, echoed back as
  "1/4 cup onto 10% left → 0.28 cups in the bowl". A **picked it up** link zeroes the bowl without
  crediting the remainder as eaten. Percentages read against the full mark, so ¼ cup → 50% → 10% is
  0.25 → 0.125 → 0.025. The tile becomes the bowl while food is down (accent, "50%", "¼ cup at 8:12a")
  and reverts to a `2 of 3` scoop-progress readout once it's empty (3 x 1/4-cup scoops a day, counted
  by volume — see SCOOP_CUPS/DAILY_SCOOP_TARGET in food.js). Food rows also get their own timeline lane.
- **Potty history card:** big success % + pee/poop counts with their own accident counts, for whichever
  day is selected. The bar strip swipes (or arrows) back 12 weeks, labelled weekday over `9/1`; every day
  is tappable, and a long-press offers to open that day on the timeline. Resets to this week + today on reload.
- **Potty ends the crate:** logging a pee or poop while a crate session is running closes it — at night
  (22:00–06:00 on the clock) it reopens one at the same instant, so the crate rows read as
  "she lasted N hours" between wake-ups. Backdated potty logs end it at the backdated time.
- **Weekly weigh-in nudge:** dismissible banner when latest weight is >7 days old.
- **Profile editor:** in-app sheet for name/DOB/target weight/vet (no seeding — user fills it in).
- **Night mode:** automatic 22:00–06:00, stripped-down dark view for 3am potty runs; the ☀️/🌙 button
  overrides it until the next boundary.

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
