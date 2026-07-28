import type { TimestampStyle } from '@/lib/discordTime'

/**
 * Hand-drawn stroke icons, one metaphor per Discord timestamp format.
 * 24x24 viewBox, stroke = currentColor.
 */
export function FormatIcon({
  kind,
  size = 16,
}: {
  kind: TimestampStyle | 'default'
  size?: number
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (kind) {
    case 't': // Short Time — minimal clock
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      )
    case 'T': // Long Time — stopwatch (seconds precision)
      return (
        <svg {...common}>
          <circle cx="12" cy="13.5" r="7.5" />
          <path d="M12 9.8v3.7l2.6 1.6" />
          <path d="M9.5 2.5h5" />
          <path d="M12 2.5v3" />
        </svg>
      )
    case 'd': // Short Date — minimal calendar
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M8 2.8v4M16 2.8v4M3.5 10h17" />
        </svg>
      )
    case 'D': // Long Date — calendar with text lines
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M8 2.8v4M16 2.8v4M3.5 10h17" />
          <path d="M7.5 14h9M7.5 17.3h5.5" />
        </svg>
      )
    case 'f': // Short Date/Time — calendar + small clock
      return (
        <svg {...common}>
          <rect x="2.5" y="4.5" width="14" height="13.5" rx="2.5" />
          <path d="M6.5 2.5v3.6M12.5 2.5v3.6M2.5 9h14" />
          <circle cx="17.8" cy="17.8" r="4" />
          <path d="M17.8 15.9v1.9l1.3.8" />
        </svg>
      )
    case 'F': // Long Date/Time — calendar + clock + sparkle (the full package)
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="13" height="12.5" rx="2.5" />
          <path d="M6.3 3.6v3.4M12.2 3.6v3.4M2.5 9.8h13" />
          <path d="M6 13.2h5.5M6 16h3.5" />
          <circle cx="17.6" cy="17.6" r="4" />
          <path d="M17.6 15.8v1.8l1.2.8" />
          <path d="M19.2 2.4l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" />
        </svg>
      )
    case 'R': // Relative Time — hourglass (time flowing)
      return (
        <svg {...common}>
          <path d="M6 2.8h12M6 21.2h12" />
          <path d="M8 2.8v2.6c0 2.8 4 3.9 4 6.6s-4 3.8-4 6.6v2.6" />
          <path d="M16 2.8v2.6c0 2.8-4 3.9-4 6.6s4 3.8 4 6.6v2.6" />
          <path d="M10.2 17.2h3.6" />
        </svg>
      )
    case 'default': // Default — code brackets (raw syntax)
      return (
        <svg {...common}>
          <path d="M8.5 6.5L3.5 12l5 5.5" />
          <path d="M15.5 6.5l5 5.5-5 5.5" />
          <path d="M13.4 4.5l-2.8 15" />
        </svg>
      )
  }
}
