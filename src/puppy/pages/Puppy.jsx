import { useState } from 'react'
import { useNightMode } from '../lib/nightMode.js'
import { useNow } from '../hooks/useNow.js'
import { usePuppyLive } from '../hooks/usePuppyLive.js'
import { usePuppyDaily } from '../hooks/usePuppyDaily.js'
import { resolveTargets, statusFor, progressFor, smartStatus } from '../lib/targets.js'
import { formatElapsed, formatClock, todayISO } from '../lib/date.js'
import { logEvent, deleteEvent, openSession, closeSession } from '../lib/supabaseQueries.js'
import PuppyCard from '../components/PuppyCard.jsx'
import LocationChooser from '../components/LocationChooser.jsx'
import LogSheet from '../components/LogSheet.jsx'
import WeightSheet from '../components/WeightSheet.jsx'
import ProfileSheet from '../components/ProfileSheet.jsx'
import UndoSnackbar from '../components/UndoSnackbar.jsx'
import TodayCard from '../components/TodayCard.jsx'
import SleepCard from '../components/SleepCard.jsx'
import FoodCard from '../components/FoodCard.jsx'
import MealSheet from '../components/MealSheet.jsx'
import PawBurst from '../components/PawBurst.jsx'
import WeightPrompt from '../components/WeightPrompt.jsx'

// Ordered card grid. `nightVisible` marks the three cards kept in night mode.
const CARDS = [
  { kind: 'event', type: 'pee', emoji: '💧', label: 'Pee', chooseLocation: true, nightVisible: true },
  { kind: 'event', type: 'poop', emoji: '💩', label: 'Poop', chooseLocation: true, nightVisible: true },
  { kind: 'event', type: 'meal', emoji: '🍽️', label: 'Meal' },
  { kind: 'session', type: 'crate', emoji: '🛏️', label: 'Crate', nightVisible: true },
  { kind: 'session', type: 'alone', emoji: '🏠', label: 'Alone', secondsTimer: true },
  { kind: 'session', type: 'walk', emoji: '🐾', label: 'Walk' },
  { kind: 'event', type: 'weight', emoji: '⚖️', label: 'Weight', special: 'weight' },
]

export default function Puppy() {
  const [night, toggleNight] = useNightMode()
  const now = useNow(1000)
  const { profile, targets, live, loading, error, refetch } = usePuppyLive()
  const { rows } = usePuppyDaily(7)

  const [chooser, setChooser] = useState(null) // { type, label }
  const [logCard, setLogCard] = useState(null) // card object for the long-press LogSheet
  const [weightOpen, setWeightOpen] = useState(false)
  const [mealOpen, setMealOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [undo, setUndo] = useState(null) // { id, label, at }
  const [burst, setBurst] = useState(0) // bump to replay the paw-burst; 0 = hidden

  const resolved = resolveTargets(targets, profile?.dob)
  const todayRow = rows.find((r) => r.day === todayISO()) ?? rows[0] ?? null
  const lastWeightAt = live.lastByType.weight?.occurred_at ?? null
  const statusLine = smartStatus(live, resolved, now)

  function celebrate() {
    if (night) return // no flashing lights at 3am
    setBurst((b) => b + 1)
  }

  async function doLog(type, label, detailObj = null) {
    try {
      const row = await logEvent(type, detailObj)
      setUndo({ id: row.id, label, at: row.occurred_at })
      refetch()
    } catch {
      /* realtime/refetch will reconcile */
    }
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

  function handleTap(card) {
    if (card.kind === 'session') {
      const open = live.openByType[card.type]
      const p = open ? closeSession(open.id) : openSession(card.type)
      p.then(refetch).catch(() => {})
      return
    }
    if (card.special === 'weight') {
      setWeightOpen(true)
      return
    }
    if (card.type === 'meal') {
      setMealOpen(true)
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
      return { active: false, status: 'neutral', progress: null, primary: '—', secondary: idleLabel[card.type] ?? 'Tap to start' }
    }

    // Event card
    const last = live.lastByType[card.type]
    const elapsed = last ? (now - new Date(last.occurred_at).getTime()) / 1000 : null
    const status = statusFor(elapsed, resolved[card.type])

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

    return {
      active: false,
      status,
      progress: progressFor(elapsed, resolved[card.type]),
      primary: elapsed != null ? formatElapsed(elapsed) : '—',
      secondary,
    }
  }

  const visibleCards = night ? CARDS.filter((c) => c.nightVisible) : CARDS

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
          {!night && (
            <div className="mb-4">
              <WeightPrompt lastWeightAt={lastWeightAt} night={night} onLogged={refetch} />
            </div>
          )}

          {/* Card grid */}
          <div className={`grid gap-3 ${night ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {visibleCards.map((card) => {
              const v = cardView(card)
              return (
                <PuppyCard
                  key={`${card.kind}-${card.type}`}
                  emoji={card.emoji}
                  label={card.label}
                  primary={v.primary}
                  secondary={v.secondary}
                  status={v.status}
                  active={v.active}
                  progress={v.progress}
                  night={night}
                  big={night}
                  onTap={() => handleTap(card)}
                  onLongPress={() => handleLongPress(card)}
                />
              )
            })}
          </div>

          {!night && (
            <div className="mt-6 space-y-4">
              <SleepCard sessions={live.sessions} now={now} />
              <FoodCard events={live.events} now={now} />
              <TodayCard today={todayRow} rows={rows} />
            </div>
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
          lastEvent={live.lastByType[logCard.type] ?? null}
          lastSession={live.lastSessionByType?.[logCard.type] ?? null}
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
      {mealOpen && (
        <MealSheet
          night={night}
          onClose={() => setMealOpen(false)}
          onLogged={(row) => {
            setUndo({ id: row.id, label: 'Meal', at: row.occurred_at })
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
