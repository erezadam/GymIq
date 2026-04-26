interface StatusBadgeProps {
  active: boolean
  /** Optional label override. */
  activeLabel?: string
  inactiveLabel?: string
}

export function StatusBadge({
  active,
  activeLabel = 'פעיל',
  inactiveLabel = 'לא פעיל',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium ${
        active
          ? 'bg-status-success/15 text-status-success'
          : 'bg-on-surface-variant/15 text-on-surface-variant'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-status-success' : 'bg-on-surface-variant'}`}
        aria-hidden="true"
      />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}

interface SecondaryBadgeProps {
  label: string
  tone?: 'neutral' | 'info' | 'accent'
}

export function SecondaryBadge({ label, tone = 'neutral' }: SecondaryBadgeProps) {
  const cls =
    tone === 'info'
      ? 'bg-status-info/15 text-status-info'
      : tone === 'accent'
        ? 'bg-accent-purple/15 text-accent-purple'
        : 'bg-surface-container-high text-on-surface-variant'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${cls}`}>
      {label}
    </span>
  )
}
