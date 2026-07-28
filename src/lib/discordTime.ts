/**
 * Discord timestamp core logic.
 *
 * Discord timestamp syntax: <t:UNIX_SECONDS> or <t:UNIX_SECONDS:STYLE>
 * Styles: t, T, d, D, f, F, R (default = f).
 * Every Discord client renders the absolute Unix timestamp locally,
 * so the ONLY thing that must be correct is the Unix seconds value.
 */

export type TimestampStyle = 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R'

export interface StyleInfo {
  code: TimestampStyle
  name: string
  syntax: string // e.g. "<t:1753459200:F>"
}

export const STYLES: { code: TimestampStyle; name: string }[] = [
  { code: 't', name: 'Short Time' },
  { code: 'T', name: 'Long Time' },
  { code: 'd', name: 'Short Date' },
  { code: 'D', name: 'Long Date' },
  { code: 'f', name: 'Short Date/Time' },
  { code: 'F', name: 'Long Date/Time' },
  { code: 'R', name: 'Relative Time' },
]

export function buildSyntax(unixSeconds: number, style: TimestampStyle): string {
  return `<t:${unixSeconds}:${style}>`
}

/** Detect the viewer's IANA timezone, e.g. "Asia/Shanghai". */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** All IANA zones supported by this runtime, UTC pinned first. */
export function listTimeZones(): string[] {
  try {
    const zones = Intl.supportedValuesOf('timeZone')
    return ['UTC', ...zones.filter((z) => z !== 'UTC')]
  } catch {
    return ['UTC']
  }
}

/**
 * Milliseconds offset of `timeZone` at the instant `utcMs`
 * (i.e. wallTimeAsUTC - trueUTC). Computed via Intl, DST-aware.
 */
export function getTimeZoneOffsetMs(timeZone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(new Date(utcMs))
  const get = (type: string): number => {
    const p = parts.find((x) => x.type === type)
    return p ? Number(p.value) : 0
  }
  let hour = get('hour')
  if (hour === 24) hour = 0 // some engines emit "24" for midnight
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second'),
  )
  const utcSecFloor = Math.floor(utcMs / 1000) * 1000
  return asUTC - utcSecFloor
}

/**
 * Convert a wall-clock time in `timeZone` to Unix seconds.
 *
 * Strategy: iterate the naive UTC guess to a fixpoint (candidate instants
 * re-probed at their own offset), then sample adjacent offset regimes
 * around the fixpoint. Each candidate is validated by inversion (does its
 * wall time in `timeZone` equal the input?) and the EARLIEST valid one
 * wins — matching Luxon/most scheduling tools for ambiguous fall-back
 * times.
 *
 * If no candidate validates, the wall time does not exist (spring-forward
 * gap): snap forward by the gap, matching Luxon (`2:30 -> 3:30`).
 */
export function wallTimeToUnixSeconds(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number, // 0-23
  minute: number, // 0-59
  timeZone: string,
): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0)
  const off = (t: number) => getTimeZoneOffsetMs(timeZone, t)

  // Iterate to a fixpoint (bounded); re-probing at the candidate itself
  // reaches the true offset regime even far from the naive guess.
  let fix = guess - off(guess)
  for (let i = 0; i < 4; i++) {
    const next = guess - off(fix)
    if (next === fix) break
    fix = next
  }

  // Candidates: fixpoint + adjacent offset regimes (ambiguous times occur
  // in two regimes; sampling fix ±2h catches both).
  const candidates = new Set<number>([
    fix,
    guess - off(fix - 2 * 3600_000),
    guess - off(fix + 2 * 3600_000),
  ])

  const valid = [...candidates]
    .filter((c) => wallMatches(c, year, month, day, hour, minute, timeZone))
    .sort((a, b) => a - b)
  if (valid.length > 0) {
    return Math.floor(valid[0] / 1000)
  }

  // Nonexistent wall time (spring-forward gap): shift forward by the gap.
  // gap = oAfter - oBefore (>0); result = guess + gap - oAfter = guess - oBefore.
  const oBefore = off(fix - 2 * 3600_000)
  const result = guess - oBefore
  return Math.floor(result / 1000)
}

/** Does instant `utcMs` render as exactly this wall time in `timeZone`? */
function wallMatches(
  utcMs: number,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): boolean {
  const w = unixSecondsToWallParts(Math.floor(utcMs / 1000), timeZone)
  const [wy, wm, wd] = w.dateStr.split('-').map(Number)
  const [wh, wmin] = w.timeStr.split(':').map(Number)
  return wy === year && wm === month && wd === day && wh === hour && wmin === minute
}

/** Validate a Date produced from input fields; returns unix seconds or null. */
export function dateToUnixSeconds(date: Date): number | null {
  const ms = date.getTime()
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / 1000)
}

/**
 * Convert Unix seconds to wall-clock components in `timeZone`.
 * Used so quick presets fill the inputs with the wall time as seen
 * in the SELECTED zone, not the browser's local zone.
 */
export function unixSecondsToWallParts(
  unixSeconds: number,
  timeZone: string,
): { dateStr: string; timeStr: string } {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const parts = dtf.formatToParts(new Date(unixSeconds * 1000))
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? ''
  let hour = get('hour')
  if (hour === '24') hour = '00'
  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    timeStr: `${hour}:${get('minute')}`,
  }
}

/** Render a preview of what Discord shows for a style, in the viewer's locale. */
export function previewTimestamp(
  unixSeconds: number,
  style: TimestampStyle,
  locale?: string,
  nowMs: number = Date.now(),
): string {
  const date = new Date(unixSeconds * 1000)
  switch (style) {
    case 't':
      return new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
    case 'T':
      return new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      }).format(date)
    case 'd':
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date)
    case 'D':
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date)
    case 'f':
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
    case 'F':
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
    case 'R':
      return relativeString(unixSeconds, locale, nowMs)
  }
}

/** Discord-style relative phrasing: "in 3 days" / "2 hours ago". */
export function relativeString(
  unixSeconds: number,
  locale?: string,
  nowMs: number = Date.now(),
): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  let diffSec = unixSeconds - Math.floor(nowMs / 1000)

  const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' },
  ]
  for (const d of divisions) {
    if (Math.abs(diffSec) < d.amount) {
      return rtf.format(Math.round(diffSec), d.unit)
    }
    diffSec /= d.amount
  }
  return rtf.format(Math.round(diffSec), 'year')
}

/** Short GMT offset label for a zone, e.g. "GMT+8". */
export function zoneOffsetLabel(timeZone: string, atMs: number = Date.now()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date(atMs))
    const tz = parts.find((p) => p.type === 'timeZoneName')
    return tz ? tz.value : ''
  } catch {
    return ''
  }
}

/* ---------------- reverse parsing ---------------- */

export interface ParsedTimestamp {
  unix: number
  /** Style suffix from the code; null for default-syntax codes and bare numbers. */
  style: TimestampStyle | null
  /** The exact matched text, e.g. "<t:1764000000:F>" or "1764000000". */
  raw: string
}

const CODE_RE = /<t:(\d{1,11})(?::([tTdDfFR]))?>/g
const BARE_RE = /(?<!\d)\d{9,11}(?!\d)/g

/**
 * Extract every Discord timestamp from arbitrary text.
 *
 * Recognizes <t:UNIX:STYLE>, <t:UNIX> and bare Unix numbers (9-11 digits —
 * shorter runs like 20260728 are dates, not timestamps). Codes with an
 * INVALID style suffix (e.g. <t:123:X>) fall back to being read as a bare
 * number, so the time still decodes. Results are in text order; the digits
 * inside a matched code are never double-counted.
 */
export function parseTimestamps(text: string): ParsedTimestamp[] {
  if (!text) return []
  const out: { at: number; ts: ParsedTimestamp }[] = []
  const codeSpans: [number, number][] = []

  for (const m of text.matchAll(CODE_RE)) {
    const unix = Number(m[1])
    out.push({ at: m.index!, ts: { unix, style: (m[2] as TimestampStyle) ?? null, raw: m[0] } })
    codeSpans.push([m.index!, m.index! + m[0].length])
  }

  for (const m of text.matchAll(BARE_RE)) {
    const start = m.index!
    const end = start + m[0].length
    if (codeSpans.some(([a, b]) => start >= a && end <= b)) continue
    out.push({ at: start, ts: { unix: Number(m[0]), style: null, raw: m[0] } })
  }

  out.sort((a, b) => a.at - b.at)
  return out.map((x) => x.ts)
}

/**
 * Compose a sentence carrying a timestamp code.
 * Every `{time}` placeholder in the template is replaced with the code;
 * without any placeholder the code is appended after a space.
 * Empty/whitespace template returns ''.
 */
export function composeMessage(template: string, unixSeconds: number, style: TimestampStyle): string {
  const t = template.trim()
  if (!t) return ''
  const code = buildSyntax(unixSeconds, style)
  return t.includes('{time}') ? t.replaceAll('{time}', code) : `${t} ${code}`
}

/**
 * Translate a whole message: every timestamp code / bare Unix number is
 * replaced IN PLACE by its rendered local time (codes keep their own style,
 * bare numbers use Long Date/Time). Returns the rewritten text + match count.
 */
export function translateTimestamps(
  text: string,
  locale?: string,
  nowMs: number = Date.now(),
): { text: string; count: number } {
  if (!text) return { text, count: 0 }
  let out = ''
  let cursor = 0
  let count = 0
  const replaceBares = (chunk: string): string =>
    chunk.replace(BARE_RE, (m) => {
      count++
      return previewTimestamp(Number(m), 'F', locale, nowMs)
    })
  for (const m of text.matchAll(CODE_RE)) {
    out += replaceBares(text.slice(cursor, m.index))
    out += previewTimestamp(Number(m[1]), (m[2] as TimestampStyle) ?? 'F', locale, nowMs)
    cursor = m.index! + m[0].length
    count++
  }
  out += replaceBares(text.slice(cursor))
  return { text: out, count }
}
