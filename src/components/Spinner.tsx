export default function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-brand-700">
      <span className="w-4 h-4 rounded-full border-2 border-brand-600/30 border-t-brand-600 animate-spin" />
      {label}
    </span>
  )
}
