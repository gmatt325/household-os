import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { upsertProfile } from '../lib/supabaseQueries.js'
import { setLight, DEFAULT_BRI } from '../lib/hue.js'

// In-app editor for the single puppy_profile row. DOB drives the dynamic pee target.
export default function ProfileSheet({ profile, night, onClose, onSaved }) {
  const [name, setName] = useState(profile?.name ?? '')
  const [dob, setDob] = useState(profile?.dob ?? '')
  const [target, setTarget] = useState(profile?.target_weight_lbs != null ? String(profile.target_weight_lbs) : '')
  const [vetName, setVetName] = useState(profile?.vet_name ?? '')
  const [vetPhone, setVetPhone] = useState(profile?.vet_phone ?? '')
  const [busy, setBusy] = useState(false)
  const [lightOn, setLightOn] = useState(false)
  const [lightBusy, setLightBusy] = useState(false)
  const [lightResult, setLightResult] = useState(null)

  const field = night
    ? 'bg-pup-nightbg border-pup-nightline text-pup-nightink'
    : 'bg-white border-pup-line text-pup-ink'
  const labelCls = `text-xs uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`

  // Debug toggle. Fires the bridge regardless of night mode or crate state so
  // reachability can be tested from the phone in broad daylight. Tracks the state
  // we last SENT rather than reading the light back: one request type means a
  // failure has exactly one possible cause.
  async function testLight() {
    const next = !lightOn
    setLightBusy(true)
    setLightResult(null)
    const res = await setLight({ on: next, bri: DEFAULT_BRI })
    if (res.ok) setLightOn(next)
    setLightResult({ ...res, on: next })
    setLightBusy(false)
  }

  async function save() {
    setBusy(true)
    try {
      const saved = await upsertProfile({
        name: name.trim() || null,
        dob: dob || null,
        target_weight_lbs: target !== '' ? Number(target) : null,
        vet_name: vetName.trim() || null,
        vet_phone: vetPhone.trim() || null,
      })
      onSaved?.(saved)
      onClose()
    } catch {
      setBusy(false)
    }
  }

  const input = (val, setter, props = {}) => (
    <input
      value={val}
      onChange={(e) => setter(e.target.value)}
      className={`w-full rounded-xl border px-4 text-base font-medium min-h-[50px] focus:outline-none focus:border-pup-accent placeholder:text-pup-muted/50 ${field}`}
      {...props}
    />
  )

  return (
    <Sheet title="Puppy profile" night={night} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Name</label>
          {input(name, setName, { placeholder: 'Bean' })}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Date of birth</label>
            {input(dob, setDob, { type: 'date' })}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Target wt (lbs)</label>
            {input(target, setTarget, { type: 'text', inputMode: 'decimal', placeholder: '18' })}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Vet name</label>
          {input(vetName, setVetName, { placeholder: 'optional' })}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Vet phone</label>
          {input(vetPhone, setVetPhone, { type: 'tel', placeholder: 'optional' })}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="w-full min-h-[56px] rounded-xl bg-pup-accent text-white text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>

        <div className={`mt-2 space-y-2 border-t pt-4 ${night ? 'border-pup-nightline' : 'border-pup-line'}`}>
          <p className={labelCls}>Debug</p>
          <button
            type="button"
            onClick={testLight}
            disabled={lightBusy}
            className="w-full min-h-[56px] rounded-xl border-2 border-pup-accent text-pup-accent text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
          >
            {lightBusy ? 'Sending…' : lightOn ? 'Turn light off' : 'Turn light on'}
          </button>
          {lightResult && (
            <p className={`text-sm font-medium ${lightResult.ok ? 'text-pup-ok' : 'text-pup-red'}`}>
              {lightResult.ok ? `Sent — light ${lightResult.on ? 'on' : 'off'}` : `Failed: ${lightResult.reason}`}
            </p>
          )}
          <p className={`text-xs ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>
            Ignores night mode. Home WiFi only.
          </p>
        </div>
      </div>
    </Sheet>
  )
}
