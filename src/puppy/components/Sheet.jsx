// Reusable bottom sheet (mobile-first) — backdrop + rounded-top card that centers
// on md+. Themed for day/night. Mirrors the MetricsBanner modal pattern.
export default function Sheet({ title, night, onClose, children }) {
  const card = night
    ? 'bg-pup-nightcard border-pup-nightline text-pup-nightink'
    : 'bg-pup-card border-pup-line text-pup-ink'
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl border p-6 pb-8 max-h-[90vh] overflow-y-auto shadow-2xl ${card}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="Close" className={`text-2xl leading-none px-1 ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
