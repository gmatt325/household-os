export default function IndicatorDot({ expanded, allComplete, onClick }) {
  const showCheck = allComplete && !expanded
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 w-8 h-8 rounded-full bg-white/60 border border-white/70 shadow-sm flex items-center justify-center text-stone-600 hover:bg-white/80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
      aria-label={expanded ? 'Collapse' : 'Expand'}
    >
      {showCheck ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: 'transform 280ms cubic-bezier(.4,0,.2,1)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  )
}
