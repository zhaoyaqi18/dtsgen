import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type CSSProperties } from 'react'
import {
  STYLES,
  buildSyntax,
  detectTimeZone,
  listTimeZones,
  previewTimestamp,
  unixSecondsToWallParts,
  wallTimeToUnixSeconds,
  zoneOffsetLabel,
  composeMessage,
  type TimestampStyle,
} from '@/lib/discordTime'
import { FormatIcon } from '@/components/FormatIcon'
import { FORMAT_ACCENTS } from '@/lib/palette'

interface ParsedInput {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

/** Strict parse of YYYY-MM-DD + HH:MM. Returns null on any invalid component. */
function parseDateTime(dateStr: string, timeStr: string): ParsedInput | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  const tm = /^(\d{2}):(\d{2})$/.exec(timeStr)
  if (!dm || !tm) return null
  const year = Number(dm[1])
  const month = Number(dm[2])
  const day = Number(dm[3])
  const hour = Number(tm[1])
  const minute = Number(tm[2])
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  if (hour > 23 || minute > 59) return null
  // reject impossible dates like Feb 30
  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null
  return { year, month, day, hour, minute }
}

const WORLD_ZONES: { city: string; zone: string }[] = [
  { city: 'Los Angeles', zone: 'America/Los_Angeles' },
  { city: 'New York', zone: 'America/New_York' },
  { city: 'London', zone: 'Europe/London' },
  { city: 'Paris', zone: 'Europe/Paris' },
  { city: 'Dubai', zone: 'Asia/Dubai' },
  { city: 'Mumbai', zone: 'Asia/Kolkata' },
  { city: 'Tokyo', zone: 'Asia/Tokyo' },
  { city: 'Sydney', zone: 'Australia/Sydney' },
]

/** "Thu, 21:30" style line for the world-clock grid. */
function worldClockLine(zone: string, unixSeconds: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(unixSeconds * 1000))
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

function FormatCard({
  style,
  name,
  unix,
  nowMs,
  syntaxOverride,
}: {
  style: TimestampStyle
  name: string
  unix: number
  nowMs: number
  syntaxOverride?: string
}) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const timer = useRef<number | null>(null)
  const syntax = syntaxOverride ?? buildSyntax(unix, style)
  const preview = previewTimestamp(unix, style, undefined, nowMs)
  const accent = FORMAT_ACCENTS[syntaxOverride !== undefined ? 'default' : style]

  const onCopy = async () => {
    const ok = await copyText(syntax)
    setState(ok ? 'ok' : 'fail')
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button
      onClick={onCopy}
      style={{ '--acc': accent } as CSSProperties}
      className="card-shine group relative flex flex-col gap-1.5 rounded-2xl border border-white/8 bg-white/[0.03] p-2.5 text-left sm:gap-2.5 sm:p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--acc)_65%,transparent)] hover:bg-[color-mix(in_srgb,var(--acc)_8%,transparent)] hover:shadow-[0_12px_40px_color-mix(in_srgb,var(--acc)_30%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] active:scale-[0.97]"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--acc)_16%,transparent)] text-[var(--acc)] ring-1 ring-[color-mix(in_srgb,var(--acc)_45%,transparent)] transition-all duration-200 group-hover:bg-[var(--acc)] group-hover:text-[#111214] group-hover:shadow-[0_0_18px_color-mix(in_srgb,var(--acc)_60%,transparent)]">
            <FormatIcon kind={syntaxOverride !== undefined ? 'default' : style} size={14} />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--acc)_80%,white)]">
            {name}
          </span>
        </div>
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors ${
            state === 'ok'
              ? 'bg-[#57F287]/20 text-[#57F287]'
              : state === 'fail'
                ? 'bg-[#ed4245]/20 text-[#ed4245]'
                : 'bg-white/5 text-[#b5bac1] group-hover:bg-[var(--acc)] group-hover:text-[#111214]'
          }`}
        >
          {state === 'ok' ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          ) : state === 'fail' ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          )}
        </span>
      </div>
      <div className="min-h-[18px] truncate text-[13px] font-medium text-[#dbdee1]">
        {state === 'ok' ? (
          <span className="text-[#57F287]">Copied!</span>
        ) : state === 'fail' ? (
          <span className="text-[#ed4245]">Copy failed — long-press the code below</span>
        ) : (
          preview
        )}
      </div>
      <code className="w-full truncate rounded-md bg-black/40 px-2 py-0.5 font-mono text-[11px] text-[#949ba4] transition-colors group-hover:text-[#c9cdfb]">
        {syntax}
      </code>
    </button>
  )
}

/** Render a message template with {time} placeholders as Discord-style timestamp pills. */
function renderWithPill(template: string, pillText: string) {
  const pill = (
    <span className="rounded bg-[#1e1f22] px-1 font-medium text-[#c9cdfb]">{pillText}</span>
  )
  if (!template.includes('{time}')) {
    return (
      <>
        {template} {pill}
      </>
    )
  }
  const parts = template.split('{time}')
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && pill}
    </span>
  ))
}

export default function TimestampTool() {
  const detected = useMemo(() => detectTimeZone(), [])
  const zones = useMemo(() => listTimeZones(), [])

  const [dateStr, setDateStr] = useState(
    () => unixSecondsToWallParts(Math.floor(Date.now() / 1000) + 86400, detected).dateStr,
  )
  const [timeStr, setTimeStr] = useState(
    () => unixSecondsToWallParts(Math.floor(Date.now() / 1000) + 86400, detected).timeStr,
  )
  const [timeZone, setTimeZone] = useState(detected)
  const [zoneQuery, setZoneQuery] = useState('')
  const [zoneOpen, setZoneOpen] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [msgStyle, setMsgStyle] = useState<TimestampStyle>('F')
  const [msgCopy, setMsgCopy] = useState<'idle' | 'ok' | 'fail'>('idle')
  const msgTimer = useRef<number | null>(null)
  const msgInputRef = useRef<HTMLTextAreaElement>(null)

  /** Insert the {time} placeholder at the cursor (falls back to appending). */
  const insertTimeAtCursor = () => {
    const el = msgInputRef.current
    if (!el) {
      setMsgText((t) => t + '{time}')
      return
    }
    const start = el.selectionStart ?? msgText.length
    const end = el.selectionEnd ?? start
    setMsgText(msgText.slice(0, start) + '{time}' + msgText.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + 6
      el.setSelectionRange(pos, pos)
    })
  }
  const [nowMs, setNowMs] = useState(() => Date.now())
  const zoneBoxRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const onCardMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (zoneBoxRef.current && !zoneBoxRef.current.contains(e.target as Node)) {
        setZoneOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const parsed = parseDateTime(dateStr, timeStr)
  const unix = parsed
    ? wallTimeToUnixSeconds(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, timeZone)
    : null

  const filteredZones = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().replace(/[_/]/g, ' ')
    const q = norm(zoneQuery.trim())
    if (!q) return zones
    return zones.filter((z) => norm(z).includes(q))
  }, [zones, zoneQuery])

  /** Fill inputs from a Unix instant, expressed in the SELECTED zone's wall time. */
  const quickSetUnix = (unixSec: number) => {
    const w = unixSecondsToWallParts(unixSec, timeZone)
    setDateStr(w.dateStr)
    setTimeStr(w.timeStr)
  }

  const nowSec = Math.floor(nowMs / 1000)
  const presets = [
    { label: 'Now', unix: nowSec },
    { label: 'In 1 hour', unix: nowSec + 3600 },
    {
      label: 'Tomorrow 9:00',
      unix: (() => {
        const w = unixSecondsToWallParts(nowSec, timeZone)
        const [y, m, d] = w.dateStr.split('-').map(Number)
        const next = new Date(Date.UTC(y, m - 1, d + 1))
        return wallTimeToUnixSeconds(
          next.getUTCFullYear(),
          next.getUTCMonth() + 1,
          next.getUTCDate(),
          9,
          0,
          timeZone,
        )
      })(),
    },
    { label: 'In 1 week', unix: nowSec + 7 * 86400 },
  ]

  const previewMsg = unix !== null ? previewTimestamp(unix, msgStyle, undefined, nowMs) : ''

  return (
    <section id="generator" className="anim-fade-up relative mx-auto w-full max-w-4xl min-[1600px]:max-w-[1180px] px-4 [animation-delay:320ms]">
      <div
        ref={cardRef}
        onMouseMove={onCardMouseMove}
        className="spotlight-host group/card relative overflow-hidden rounded-3xl border border-white/10 bg-[#1e1f22]/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-8"
      >
        {/* cursor-tracking spotlight */}
        <div className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />
      <div className="relative">
        {/* inputs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.4fr] sm:gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949ba4]">Date</span>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="h-11 rounded-xl border border-white/10 bg-[#111214] px-3 text-[15px] text-[#dbdee1] outline-none transition-colors focus:border-[#5865F2] [color-scheme:dark]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949ba4]">Time</span>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="h-11 rounded-xl border border-white/10 bg-[#111214] px-3 text-[15px] text-[#dbdee1] outline-none transition-colors focus:border-[#5865F2] [color-scheme:dark]"
            />
          </label>
          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1" ref={zoneBoxRef}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949ba4]">
              Timezone <span className="normal-case text-[#5865F2]">({zoneOffsetLabel(timeZone, nowMs)})</span>
            </span>
            <div className="relative">
              <input
                type="text"
                value={zoneOpen ? zoneQuery : timeZone.replace(/_/g, ' ')}
                placeholder="Search timezone…"
                onFocus={() => {
                  setZoneOpen(true)
                  setZoneQuery('')
                }}
                onChange={(e) => {
                  setZoneQuery(e.target.value)
                  setZoneOpen(true)
                }}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#111214] px-3 text-[15px] text-[#dbdee1] outline-none transition-colors focus:border-[#5865F2]"
              />
              {zoneOpen && (
                <div className="absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-[#111214] shadow-2xl">
                  <button
                    className="block w-full px-3 py-2 text-left text-sm text-[#949cf7] hover:bg-[#5865F2]/15"
                    onClick={() => {
                      setTimeZone(detected)
                      setZoneOpen(false)
                    }}
                  >
                    Auto-detect: {detected.replace(/_/g, ' ')}
                  </button>
                  {filteredZones.slice(0, 100).map((z) => (
                    <button
                      key={z}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#5865F2]/15 ${
                        z === timeZone ? 'bg-[#5865F2]/25 text-white' : 'text-[#dbdee1]'
                      }`}
                      onClick={() => {
                        setTimeZone(z)
                        setZoneOpen(false)
                      }}
                    >
                      {z.replace(/_/g, ' ')}
                      <span className="ml-2 text-xs text-[#6d6f78]">{zoneOffsetLabel(z, nowMs)}</span>
                    </button>
                  ))}
                  {filteredZones.length === 0 && (
                    <div className="px-3 py-2 text-sm text-[#6d6f78]">No matching timezone</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* quick presets */}
        <div className="mt-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#6d6f78]">Quick set:</span>
          <div className="mt-1.5 flex items-center gap-1.5">
            {presets.map((q) => (
              <button
                key={q.label}
                onClick={() => quickSetUnix(q.unix)}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#b5bac1] transition-colors hover:border-[#5865F2]/50 hover:bg-[#5865F2]/15 hover:text-white"
              >
                {q.label}
              </button>
            ))}
            {unix !== null && (
              <span className="ml-auto shrink-0 rounded-md bg-black/40 px-2 py-1 font-mono text-[11px] text-[#6d6f78]">
                unix: {unix}
              </span>
            )}
          </div>
        </div>

        {unix === null && (
          <div className="mt-5 rounded-xl border border-[#f0b232]/40 bg-[#f0b232]/10 px-4 py-3 text-sm text-[#f0b232]">
            Please enter a valid date and time.
          </div>
        )}

        {unix !== null && unix * 1000 <= nowMs && (
          <div className="mt-5 rounded-xl border border-[#f0b232]/30 bg-[#f0b232]/[0.07] px-4 py-2.5 text-[13px] text-[#f0b232]">
            Heads-up: this moment is in the past — the Relative format will read “… ago”.
          </div>
        )}

        {/* format grid */}
        {unix !== null && (
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {STYLES.map((s) => (
              <FormatCard key={s.code} style={s.code} name={s.name} unix={unix} nowMs={nowMs} />
            ))}
            <FormatCard
              style="f"
              name="Default"
              unix={unix}
              nowMs={nowMs}
              syntaxOverride={`<t:${unix}>`}
            />
            <div className="col-span-2 flex flex-col justify-center gap-1 rounded-2xl border border-dashed border-white/10 p-4 text-center lg:col-span-1">
              <p className="text-sm font-medium text-[#b5bac1]">Click any card to copy</p>
              <p className="text-xs text-[#6d6f78]">Paste directly into Discord — it renders automatically</p>
            </div>
          </div>
        )}

        {/* message composer: one input panel, one live-compiled output panel */}
        {unix !== null && (
          <div id="composer" className="mt-6 scroll-mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#949ba4]">
              Compose your message <span className="ml-1 rounded bg-[#57F287]/15 px-1.5 py-px text-[10px] font-bold normal-case text-[#57F287]">riddle mode</span>
            </p>

            {/* ---- panel 1: input ---- */}
            <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6d6f78]">Your message</p>
                <button
                  onClick={insertTimeAtCursor}
                  className="rounded-full border border-[#5865F2]/50 bg-[#5865F2]/15 px-3 py-1 text-[11px] font-semibold text-[#949cf7] transition-all hover:bg-[#5865F2] hover:text-white active:scale-95"
                >
                  ＋ Insert time at cursor
                </button>
              </div>
              <textarea
                ref={msgInputRef}
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder={"Type your sentence — then click “Insert time at cursor” to drop the timestamp exactly where you want it: start, middle or end…"}
                rows={4}
                maxLength={300}
                className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#111214] px-3 py-2.5 text-xs text-[#dbdee1] outline-none transition-colors placeholder:text-[#6d6f78] focus:border-[#5865F2] sm:text-[14px]"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#6d6f78]">
                The timestamp lands wherever the{' '}
                <code className="rounded bg-black/40 px-1 font-mono text-[#c9cdfb]">{'{time}'}</code>{' '}
                marker is — no marker, it goes at the end. Multiple markers are allowed.
              </p>
            </div>

            {/* ---- panel 2: live-compiled output ---- */}
            {msgText.trim() && (
              <div className="mt-3 rounded-2xl border border-[#57F287]/25 bg-[#57F287]/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6d6f78]">
                  Compiled — ready to paste
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#dbdee1]">
                  {renderWithPill(msgText.trim(), previewMsg)}
                </p>
                <div className="mt-2 break-all rounded-xl bg-black/40 px-3 py-2 font-mono text-[12px] leading-relaxed text-[#949ba4]">
                  {composeMessage(msgText, unix, msgStyle)}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-[#6d6f78]">Format:</span>
                  {STYLES.map((st) => (
                    <button
                      key={st.code}
                      onClick={() => setMsgStyle(st.code)}
                      className={`rounded-md px-2 py-1 font-mono text-[11px] font-bold transition-all active:scale-95 ${
                        msgStyle === st.code
                          ? 'bg-[#5865F2] text-white shadow-[0_0_12px_rgba(88,101,242,0.5)]'
                          : 'border border-white/10 bg-white/[0.04] text-[#b5bac1] hover:border-[#5865F2]/50 hover:text-white'
                      }`}
                    >
                      {st.code}
                    </button>
                  ))}
                  <button
                    onClick={async () => {
                      const ok = await copyText(composeMessage(msgText, unix, msgStyle))
                      setMsgCopy(ok ? 'ok' : 'fail')
                      if (msgTimer.current) window.clearTimeout(msgTimer.current)
                      msgTimer.current = window.setTimeout(() => setMsgCopy('idle'), 2000)
                    }}
                    className={`ml-auto rounded-full px-5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                      msgCopy === 'ok'
                        ? 'bg-[#57F287] text-[#111214] shadow-[0_0_16px_rgba(87,242,135,0.5)]'
                        : 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 hover:-translate-y-0.5 hover:bg-[#4752c4]'
                    }`}
                  >
                    {msgCopy === 'ok' ? '✓ Copied' : msgCopy === 'fail' ? 'Copy failed' : 'Copy message'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* world clock: this moment across major zones */}
        {unix !== null && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#949ba4]">
              This moment around the world
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WORLD_ZONES.map((z) => (
                <div
                  key={z.zone}
                  className={`rounded-xl border px-3 py-2.5 ${
                    z.zone === timeZone
                      ? 'border-[#5865F2]/50 bg-[#5865F2]/10'
                      : 'border-white/8 bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[12px] font-semibold text-[#dbdee1]">{z.city}</span>
                    <span className="text-[10px] text-[#6d6f78]">{zoneOffsetLabel(z.zone, unix * 1000)}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[13px] font-bold tabular-nums text-[#c9cdfb]">
                    {worldClockLine(z.zone, unix)}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[#6d6f78]">
              No conversions needed inside Discord — but handy for screenshots &amp; announcements.
            </p>
          </div>
        )}
      </div>
      </div>
    </section>
  )
}
