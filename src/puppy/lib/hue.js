// Philips Hue bridge control, for lighting the way on a night-time potty run.
//
// This is a CLIENT-SIDE fetch on purpose. The bridge only answers devices on the
// home LAN, so Vercel's server can never reach it — the call works because
// whoever taps the button is physically at home, which is the entire use case.
//
// Everything here fails soft. Logging Poppy's crate time is the feature that
// matters; a dark hallway is an inconvenience, a lost crate log is not.

const BRIDGE_IP = import.meta.env.VITE_HUE_BRIDGE_IP
const API_KEY = import.meta.env.VITE_HUE_API_KEY

const LIGHT_ID = 7 // "Desk Lamp"
const TIMEOUT_MS = 2500 // an unreachable bridge must never hang a tap

// Hue's brightness scale is 1–254, NOT 0–100.
export const BRI_MIN = 1
export const BRI_MAX = 254
export const DEFAULT_BRI = 60

export function clampBri(n) {
  if (n == null || n === '') return DEFAULT_BRI
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return DEFAULT_BRI
  return Math.min(BRI_MAX, Math.max(BRI_MIN, v))
}

function fail(reason) {
  console.warn(`[hue] ${reason}`)
  return { ok: false, reason }
}

// PUT the light state. Returns { ok: true } or { ok: false, reason } and never
// throws, so each caller picks how loud to be: the debug toggle in ProfileSheet
// prints `reason` on screen (you're holding a phone, where console.warn is
// invisible), while the crate trigger ignores the result entirely.
export async function setLight({ on, bri }) {
  if (!BRIDGE_IP || !API_KEY) return fail('no-env')

  // Brightness is omitted on an off-command: the bridge stores whatever it's
  // sent, so passing bri here would quietly redefine the NEXT on-command.
  const body = on ? { on: true, bri: clampBri(bri) } : { on: false }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`http://${BRIDGE_IP}/api/${API_KEY}/lights/${LIGHT_ID}/state`, {
      method: 'PUT',
      body: JSON.stringify(body),
      signal: ctrl.signal,
      // No custom headers on purpose. The bridge parses the raw body fine
      // without a Content-Type, and omitting it keeps this a "simple" request —
      // no CORS preflight round-trip. (Verified 2026-08-23: this bridge does
      // answer OPTIONS correctly and sends Allow-Origin *, so a Content-Type
      // would also work; skipping the extra round-trip is just cheaper.)
    })
    if (!res.ok) return fail(`http-${res.status}`)
    // Hue reports application errors with a 200 and a body of [{ error: {...} }],
    // so a non-error status is not on its own a success.
    const payload = await res.json().catch(() => null)
    const err = Array.isArray(payload) ? payload.find((e) => e?.error)?.error : null
    if (err) return fail(`hue-${err.description ?? 'error'}`)
    return { ok: true }
  } catch (e) {
    // A mixed-content block and a genuine network failure are indistinguishable
    // here — both arrive as a bare TypeError. Telling them apart needs the
    // http-localhost vs https-deploy A/B described in the plan, not more code.
    return fail(e?.name === 'AbortError' ? 'timeout' : 'network')
  } finally {
    clearTimeout(timer)
  }
}
