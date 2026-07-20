import { useEffect, useState } from 'react'

// Ticking clock driving live count-ups. Returns Date.now(), updated every
// `intervalMs` (default 1s).
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
