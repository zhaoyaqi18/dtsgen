import { useEffect, useMemo, useState } from 'react'
import {
  STYLES,
  parseTimestamps,
  previewTimestamp,
  relativeString,
  translateTimestamps,
  type ParsedTimestamp,
} from '@/lib/discordTime'

function styleLabel(style: ParsedTimestamp['style']): string {
  if (!style) return 'Default / bare unix'
  return STYLES.find((s) => s.code === style)?.name ?? style
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function TimestampDecoder() {
  const [input, setInput] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle')

  const found = useMemo(() => parseTimestamps(input), [input])
  const translated = useMemo(
    () => translateTimestamps(input, undefined, nowMs),
    [input, nowMs],
  )

  // refresh relative phrasing once per second while results are on screen
  useEffect(() => {
    if (found.length === 0) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [found.length])

  return (
    <section id="decoder" className="anim-fade-up relative mx-auto mt-8 w-full max-w-4xl px-4 [animation-delay:380ms]">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#1e1f22]/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-8">
        {/* header */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#57F287] to-[#2da866] text-[#111214] shadow-lg shadow-[#57F287]/30 ring-1 ring-white/20">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
              <path d="M11 8v3l2 2" />
            </svg>
          </span>
          <div>
            <h2 className="font-display text-[17px] font-bold tracking-tight text-[#f2f3f5]">
              Timestamp Decoder
            </h2>
            <p className="text-[13px] text-[#949ba4]">
              Got a code like <code className="rounded bg-black/40 px-1 font-mono text-[12px] text-[#c9cdfb">&lt;t:1764547200:F&gt;</code> or a bare Unix number? Paste it — see when it actually is.
            </p>
          </div>
        </div>

        {/* input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste timestamp codes or Unix numbers here — a whole announcement works, every timestamp in it will be decoded…"
          rows={3}
          className="mt-5 w-full resize-y rounded-xl border border-white/10 bg-[#111214] px-4 py-3 font-mono text-[13px] text-[#dbdee1] outline-none transition-colors placeholder:text-[#6d6f78] focus:border-[#57F287]"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[12px] text-[#6d6f78]">
            {input
              ? found.length > 0
                ? `${found.length} timestamp${found.length > 1 ? 's' : ''} found`
                : 'no timestamp found in this text'
              : 'Decodes instantly as you paste — no button needed'}
          </p>
        </div>

        {/* translated whole message — the primary result */}
        {input && found.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#57F287]/25 bg-[#57F287]/[0.05] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6d6f78]">
                Translated message
              </p>
              <button
                onClick={async () => {
                  const ok = await copyText(translated.text)
                  setCopyState(ok ? 'ok' : 'fail')
                  window.setTimeout(() => setCopyState('idle'), 2000)
                }}
                className={`rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
                  copyState === 'ok'
                    ? 'bg-[#57F287] text-[#111214] shadow-[0_0_14px_rgba(87,242,135,0.5)]'
                    : 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 hover:-translate-y-0.5 hover:bg-[#4752c4]'
                }`}
              >
                {copyState === 'ok' ? '✓ Copied' : copyState === 'fail' ? 'Copy failed' : 'Copy translation'}
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#f2f3f5]">
              {translated.text}
            </p>
          </div>
        )}

        {/* per-timestamp detail cards */}
        {input && found.length > 0 && (
          <div className="mt-4 space-y-2.5">
            {found.map((t, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-2xl border border-[#57F287]/20 bg-[#57F287]/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-[#f2f3f5]">
                    {previewTimestamp(t.unix, 'F', undefined, nowMs)}
                  </div>
                  <div className="mt-0.5 text-[13px] font-medium text-[#57F287]">
                    {relativeString(t.unix, undefined, nowMs)}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#57F287]/15 px-2 py-1 text-[11px] font-semibold text-[#57F287]">
                    {styleLabel(t.style)}
                  </span>
                  <code className="max-w-[220px] truncate rounded-md bg-black/40 px-2 py-1 font-mono text-[12px] text-[#949ba4]">
                    {t.raw}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}

        {input && found.length === 0 && (
          <div className="mt-4 rounded-xl border border-[#f0b232]/40 bg-[#f0b232]/10 px-4 py-3 text-sm text-[#f0b232]">
            No timestamp here. A valid one looks like <code className="font-mono">&lt;t:1764547200:F&gt;</code> or a 9–11 digit Unix number.
          </div>
        )}
      </div>
    </section>
  )
}
