import { useEffect } from 'react'

// A quick shower of paw prints radiating from center — played when a successful
// potty is logged. Self-unmounts after the animation (~900ms) via onDone.
const PAWS = [
  { tx: -72, ty: -46, rot: -20, d: 0 },
  { tx: 74, ty: -54, rot: 25, d: 40 },
  { tx: -40, ty: -96, rot: -10, d: 80 },
  { tx: 46, ty: -100, rot: 15, d: 20 },
  { tx: 4, ty: -124, rot: 0, d: 60 },
  { tx: -92, ty: 6, rot: -30, d: 100 },
]

export default function PawBurst({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <div className="relative">
        {PAWS.map((p, i) => (
          <span
            key={i}
            className="absolute text-4xl"
            style={{
              animation: 'pawBurst 900ms ease-out forwards',
              animationDelay: `${p.d}ms`,
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--rot': `${p.rot}deg`,
            }}
          >
            🐾
          </span>
        ))}
      </div>
    </div>
  )
}
