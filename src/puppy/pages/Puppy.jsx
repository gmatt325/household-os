import { useRef, useState } from 'react'
import { useNightMode } from '../lib/nightMode.js'
import { useNow } from '../hooks/useNow.js'
import { usePuppyLive } from '../hooks/usePuppyLive.js'
import { usePuppyDaily } from '../hooks/usePuppyDaily.js'
import { resolveTargets, statusFor, progressFor, smartStatus } from '../lib/targets.js'
import { bowlState, foodDayTotals, formatCups, formatScoops, DAILY_SCOOP_TARGET } from '../lib/food.js'
import { formatElapsed, formatClock, todayISO } from '../lib/date.js'
import { formatAge } from '../lib/age.js'
import { logEvent, deleteEvent, openSession, closeSession } from '../lib/supabaseQueries.js'
import { endCrateForPotty } from '../lib/crate.js'
import PuppyCard from '../components/PuppyCard.jsx'
import LocationChooser from '../components/LocationChooser.jsx'
import LogSheet from '../components/LogSheet.jsx'
import WeightSheet from '../components/WeightSheet.jsx'
import ProfileSheet from '../components/ProfileSheet.jsx'
import UndoSnackbar from '../components/UndoSnackbar.jsx'
import TodayCard from '../components/TodayCard.jsx'
import SleepCard from '../components/SleepCard.jsx'
import PuppyPager from '../components/PuppyPager.jsx'
import DayTimeline from '../components/DayTimeline.jsx'
import FoodCard from '../components/FoodCard.jsx'
import FoodSheet from '../components/FoodSheet.jsx'
import PawBurst from '../components/PawBurst.jsx'
import WeightPrompt from '../components/WeightPrompt.jsx'

// Ordered cards. `slot` drives layout: 'full' = full-width stacked (the
// high-frequency ones), 'small' = half-width, 'wide' = short horizontal row
// below the sleep pager. `nightVisible` marks the three kept in night mode.
// `noTimer` cards never show an idle "time since" — a running session still
// counts up. `hidden` keeps a card defined but off the grid. `kind: 'info'`
// cards are derived read-outs, not log buttons — `static` strips their handlers.
const CARDS = [
  { kind: 'event', type: 'pee', emoji: '💧', label: 'Pee', chooseLocation: true, nightVisible: true, slot: 'full' },
  { kind: 'event', type: 'poop', emoji: '💩', label: 'Poop', chooseLocation: true, nightVisible: true, slot: 'full' },
  { kind: 'event', type: 'meal', emoji: '🍽️', label: 'Food', slot: 'full' },
  { kind: 'session', type: 'crate', emoji: '🛏️', label: 'Crate', nightVisible: true, slot: 'full' },
  { kind: 'session', type: 'walk', emoji: '🐾', label: 'Walk', slot: 'small', noTimer: true },
  { kind: 'info', type: 'age', emoji: '🎂', label: 'Age', special: 'age', slot: 'small', static: true },
  { kind: 'session', type: 'alone', emoji: '🏠', label: 'Alone', secondsTimer: true, noTimer: true, slot: 'small', hidden: true },
  { kind: 'event', type: 'weight', emoji: '⚖️', label: 'Weight', special: 'weight', slot: 'wide', noTimer: true },
]

export default function Puppy() {
  const [night, toggleNight] = useNightMode()
  const now = useNow(1000)
  const { profile, targets, live, loading, error, refetch } = usePuppyLive()
  const { rows } = usePuppyDaily(84) // 12 weeks — the whole span the trend card scrolls

  const [chooser, setChooser] = useState(null) // { type, label }
  const [logCard, setLogCard] = useState(null) // card object for the long-press LogSheet
  const [weightOpen, setWeightOpen] = useState(false)
  const [foodOpen, setFoodOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [undo, setUndo] = useState(null) // { id, label, at }
  const [dayISO, setDayISO] = useState(todayISO) // selected day on the timeline page
  const [burst, setBurst] = useState(0) // bump to replay the paw-burst; 0 = hidden
  const [actionErr, setActionErr] = useState(null) // failed tap — surfaced under the header
  const pagerRef = useRef(null) // lets the trend card jump to the timeline page

  const resolved = resolveTargets(targets, profile?.dob)
  const lastWeightAt = live.lastByType.weight?.occurred_at ?? null
  const bowl = bowlState(live.events)
  const midnightMs = new Date(now).setHours(0, 0, 0, 0)
  const todayFood = foodDayTotals(live.events, midnightMs)
  const statusLine = smartStatus(live, resolved, now, bowl)

  function celebrate() {
    if (night) return // no flashing lights at 3am
    setBurst((b) => b + 1)
  }

  async function doLog(type, label, detailObj = null) {
    let row
    try {
      row = await logEvent(type, detailObj)
      setUndo({ id: row.id, label, at: row.occurred_at })
      setActionErr(null)
    } catch {
      setActionErr(`Couldn't log ${label.toLowerCase()} — try again.`)
      return
    }
    // A potty break gets her out of the crate (and at night straight back in).
    // Its own try: the event is already written, so a crate failure must not
    // read as "the pee didn't log".
    if (type === 'pee' || type === 'poop') {
      try {
        await endCrateForPotty(live.openByType.crate)
      } catch {
        setActionErr("Logged, but couldn't end the crate session.")
      }
    }
    refetch()
  }

  async function handleUndo() {
    if (!undo) return
    const id = undo.id
    setUndo(null)
    try {
      await deleteEvent(id)
      refetch()
    } catch {}
  }

  async function handleTap(card) {
    if (card.kind === 'session') {
      const open = live.openByType[card.type]
      try {
        await (open ? closeSession(open.id) : openSession(card.type))
        setActionErr(null)
      } catch (e) {
        // 23505 = puppy_sessions_one_open_per_type — the other phone already
        // started this one. Refetching re-renders the card as active, so say so
        // rather than leaving a tap that looks like it did nothing.
        setActionErr(
          e?.code === '23505'
            ? `${card.label} was already running on the other phone — refreshed.`
            : `Couldn't update ${card.label.toLowerCase()} — try again.`,
        )
      }
      refetch()
      return
    }
    if (card.special === 'weight') {
      setWeightOpen(true)
      return
    }
    if (card.type === 'meal') {
      setFoodOpen(true)
      return
    }
    if (card.chooseLocation) {
      setChooser({ type: card.type, label: card.label })
      return
    }
    doLog(card.type, card.label)
  }

  function handleLongPress(card) {
    // Long-press any card → backdate/log sheet (also edits the most recent entry).
    setLogCard(card)
  }

  // Derive the display props for a card from live data + the ticking clock.
  function cardView(card) {
    // Derived read-outs come first — cardView has no default branch, so an
    // unhandled kind would fall through to the event path and look up a
    // lastByType entry that will never exist.
    if (card.kind === 'info' && card.special === 'age') {
      const age = formatAge(profile?.dob, now)
      const base = { active: false, status: 'neutral', progress: null }
      return age
        ? { ...base, primary: age.primary, unit: age.unit, secondary: age.detail }
        : { ...base, primary: '—', unit: null, secondary: 'Set her birthday in profile' }
    }
    if (card.kind === 'session') {
      const open = live.openByType[card.type]
      const runningLabel = { crate: 'In crate — tap to end', walk: 'Walking — tap to end', alone: 'Alone — tap to end' }
      const idleLabel = { walk: 'Tap to walk', alone: 'Tap when alone' }
      if (open) {
        const elapsed = (now - new Date(open.started_at).getTime()) / 1000
        return {
          active: true,
          status: 'neutral',
          progress: 1,
          primary: formatElapsed(elapsed, { allowSeconds: card.secondsTimer }),
          secondary: runningLabel[card.type] ?? 'Tap to end',
        }
      }
      if (card.type === 'crate') {
        const closed = live.lastClosedCrate
        const elapsed = closed ? (now - new Date(closed.ended_at).getTime()) / 1000 : null
        const status = statusFor(elapsed, resolved.crate)
        const napCopy = status === 'red' ? 'Nap overdue' : status === 'amber' ? 'Nap due soon' : 'Out of crate'
        return {
          active: false,
          status,
          progress: progressFor(elapsed, resolved.crate),
          primary: elapsed != null ? formatElapsed(elapsed) : '—',
          secondary: closed ? napCopy : 'Tap to crate',
        }
      }
      // Idle walk/alone: no counter at all, just the prompt.
      return {
        active: false,
        status: 'neutral',
        progress: null,
        primary: card.noTimer ? null : '—',
        secondary: idleLabel[card.type] ?? 'Tap to start',
      }
    }

    // Food: two states. While there's food in the bowl the card is the bowl —
    // an accent "active" tile showing what's left, same grammar as an open
    // session. You can't be overdue for a meal that's sitting right there, so
    // the amber/red countdown only comes back once the bowl is empty.
    if (card.type === 'meal' && bowl.hasFood) {
      return {
        active: true,
        status: 'neutral',
        progress: 1,
        primary: `${bowl.leftPct ?? 0}%`,
        secondary: `${formatCups(bowl.lastDown?.addedCups ?? 0)} cup at ${formatClock(bowl.downAt)} · tap to update`,
      }
    }

    // Event card
    const last = live.lastByType[card.type]
    const elapsed = last ? (now - new Date(last.occurred_at).getTime()) / 1000 : null
    const status = statusFor(elapsed, resolved[card.type])

    // Empty bowl: the useful number isn't a countdown, it's how much of today's
    // food has actually gone down. Ring = progress through the day's scoops;
    // colour still comes from time-since-last, which is what the secondary line
    // now spells out in words.
    if (card.type === 'meal') {
      return {
        active: false,
        status,
        progress: Math.min(1, todayFood.scoops / DAILY_SCOOP_TARGET),
        primary: `${formatScoops(todayFood.putDownCups)} of ${DAILY_SCOOP_TARGET}`,
        unit: 'scoops today',
        secondary: elapsed != null ? `${formatElapsed(elapsed)} since last` : 'Tap to log',
      }
    }

    let secondary
    if (card.type === 'weight') {
      secondary = last?.detail?.lbs != null ? `${last.detail.lbs} lbs` : 'Tap to log'
    } else if (!last) {
      secondary = 'Tap to log'
    } else if (status === 'red') {
      secondary = 'Overdue!'
    } else if (status === 'amber') {
      secondary = 'Due soon'
    } else {
      secondary = `since ${formatClock(last.occurred_at)}`
    }

    if (card.noTimer) {
      // e.g. Weight — the last logged value is the useful number, not "3d ago".
      return { active: false, status: 'neutral', progress: null, primary: null, secondary }
    }

    return {
      active: false,
      status,
      progress: progressFor(elapsed, resolved[card.type]),
      primary: elapsed != null ? formatElapsed(elapsed) : '—',
      secondary,
    }
  }

  // Layout groups. Night keeps the stripped-down Pee/Poop/Crate view.
  const shown = CARDS.filter((c) => !c.hidden)
  const nightCards = shown.filter((c) => c.nightVisible)
  const fullCards = shown.filter((c) => c.slot === 'full')
  const smallCards = shown.filter((c) => c.slot === 'small')
  const wideCards = shown.filter((c) => c.slot === 'wide')

  function renderCard(card, extra = {}) {
    const v = cardView(card)
    return (
      <PuppyCard
        key={`${card.kind}-${card.type}`}
        emoji={card.emoji}
        label={card.label}
        primary={v.primary}
        unit={v.unit}
        secondary={v.secondary}
        status={v.status}
        active={v.active}
        progress={v.progress}
        night={night}
        readOnly={card.static}
        onTap={card.static ? undefined : () => handleTap(card)}
        onLongPress={card.static ? undefined : () => handleLongPress(card)}
        {...extra}
      />
    )
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={`text-2xl font-bold tracking-tight ${night ? '' : 'font-serif'}`}>
            {profile?.name ? profile.name : 'Puppy'}
          </h1>
          {!loading && !error && (
            <p className={`mt-0.5 text-sm ${night ? 'text-zinc-400' : 'text-pup-muted'}`}>{statusLine}</p>
          )}
          {actionErr && (
            <button
              type="button"
              onClick={() => setActionErr(null)}
              className="mt-1 text-left text-xs text-pup-red"
            >
              {actionErr} <span className="underline">dismiss</span>
            </button>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleNight}
            aria-label="Toggle night mode"
            title="Night mode"
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center text-lg ${night ? 'text-pup-accent' : 'text-pup-muted'}`}
          >
            {night ? '🌙' : '☀️'}
          </button>
          {!night && (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Profile"
              title="Profile"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-lg text-pup-muted"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {loading && (
        <p className={`text-sm uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>Loading…</p>
      )}
      {!loading && error && (
        <div className="py-2">
          <p className="mb-3 text-sm text-pup-red">Couldn't load — try again.</p>
          <button onClick={refetch} className="min-h-[44px] rounded-xl border border-pup-line px-4 text-xs uppercase tracking-widest text-pup-muted">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {night ? (
            // 3am view: stripped down, no pager.
            <div className="grid grid-cols-1 gap-3">
              {nightCards.map((card) => renderCard(card, { big: true }))}
            </div>
          ) : (
            // The whole tab is a pager — swipe and everything below the header
            // slides away to reveal the timeline.
            <PuppyPager ref={pagerRef} labels={['Poppy', 'Timeline']}>
              <div>
                <div className="mb-4">
                  <WeightPrompt lastWeightAt={lastWeightAt} night={night} onLogged={refetch} />
                </div>

                {/* High-frequency taps: full width, stacked */}
                <div className="grid grid-cols-1 gap-3">
                  {fullCards.map((card) => renderCard(card, { big: true }))}
                </div>

                {/* Secondary tiles: half width */}
                {smallCards.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {smallCards.map((card) => renderCard(card))}
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  <SleepCard sessions={live.sessions} now={now} />
                  {wideCards.map((card) => renderCard(card, { wide: true }))}
                  <FoodCard totals={todayFood} />
                  <TodayCard
                    rows={rows}
                    onOpenTimeline={(day) => {
                      setDayISO(day)
                      pagerRef.current?.goTo(1)
                    }}
                  />
                </div>
              </div>

              <DayTimeline dayISO={dayISO} onDayChange={setDayISO} now={now} night={night} />
            </PuppyPager>
          )}
        </>
      )}

      {burst > 0 && <PawBurst key={burst} onDone={() => setBurst(0)} />}

      {/* Sheets & overlays */}
      {chooser && (
        <LocationChooser
          eventLabel={chooser.label}
          night={night}
          onClose={() => setChooser(null)} // × / backdrop cancels — nothing logged
          onChoose={(location) => {
            doLog(chooser.type, chooser.label, { location })
            if (location !== 'indoor_accident') celebrate() // 🐾 win!
            setChooser(null)
          }}
        />
      )}
      {logCard && (
        <LogSheet
          key={`${logCard.kind}-${logCard.type}`}
          card={logCard}
          lastEvent={logCard.type === 'meal' ? (bowl.lastRow?.row ?? null) : live.lastByType[logCard.type] ?? null}
          bowl={bowl}
          events={live.events}
          lastSession={live.lastSessionByType?.[logCard.type] ?? null}
          openCrate={live.openByType.crate ?? null}
          openSession={live.openByType[logCard.type] ?? null}
          night={night}
          onClose={() => setLogCard(null)}
          onChanged={refetch}
          onCelebrate={celebrate}
        />
      )}
      {weightOpen && (
        <WeightSheet
          night={night}
          onClose={() => setWeightOpen(false)}
          onLogged={(row) => {
            setUndo({ id: row.id, label: 'Weight', at: row.occurred_at })
            refetch()
          }}
        />
      )}
      {foodOpen && (
        <FoodSheet
          bowl={bowl}
          night={night}
          onClose={() => setFoodOpen(false)}
          onLogged={(row, label) => {
            setUndo({ id: row.id, label, at: row.occurred_at })
            refetch()
          }}
        />
      )}
      {profileOpen && (
        <ProfileSheet
          profile={profile}
          night={night}
          onClose={() => setProfileOpen(false)}
          onSaved={refetch}
        />
      )}

      <UndoSnackbar
        entry={undo}
        now={now}
        night={night}
        onUndo={handleUndo}
        onDismiss={() => setUndo(null)}
      />
    </div>
  )
}
