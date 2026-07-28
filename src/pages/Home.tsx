import { useEffect, useState } from 'react'
import TimestampTool from '@/sections/TimestampTool'
import TimestampDecoder from '@/sections/TimestampDecoder'
import SeoContent from '@/sections/SeoContent'

function NeonRing() {
  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0">
        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
        <g className="neon-ring-arc" style={{ transformOrigin: '20px 20px' }}>
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="url(#neonGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="30 70.5"
          />
        </g>
        <defs>
          <linearGradient id="neonGrad" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#5865F2" />
            <stop offset="55%" stopColor="#949cf7" />
            <stop offset="100%" stopColor="#eb459e" />
          </linearGradient>
        </defs>
      </svg>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#57F287] opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#57F287]" />
      </span>
    </span>
  )
}

function LiveUnixBadge() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="anim-fade-up mx-auto mt-9 inline-flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] py-2 pl-2 pr-5 shadow-[0_0_30px_rgba(88,101,242,0.15)] backdrop-blur-md [animation-delay:260ms]">
      <NeonRing />
      <div className="text-left">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6d6f78]">
          Live Unix time
        </div>
        <div className="font-mono text-lg font-bold tabular-nums leading-tight text-[#c9cdfb]">
          {now}
        </div>
      </div>
      <span className="h-6 w-[2px] animate-pulse rounded bg-[#5865F2]" />
    </div>
  )
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#111214] font-sans">
      {/* ambient aurora background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="dot-grid absolute inset-0" />
        <div className="aurora-a absolute -top-44 left-1/2 h-[500px] w-[860px] rounded-full bg-[#5865F2]/25 blur-[140px]" />
        <div className="aurora-b absolute top-[420px] -left-44 h-[380px] w-[380px] rounded-full bg-[#eb459e]/10 blur-[120px]" />
        <div className="aurora-c absolute top-[680px] -right-44 h-[380px] w-[380px] rounded-full bg-[#57F287]/10 blur-[120px]" />
        <div className="cyber-floor absolute inset-x-0 top-[190px] h-[420px]" />
      </div>

      {/* header */}
      <header className="anim-fade-up relative mx-auto flex w-full max-w-4xl items-center justify-between px-4 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5865F2] to-[#8b95f8] shadow-lg shadow-[#5865F2]/40 ring-1 ring-white/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </div>
          <span className="font-display text-[15px] font-bold tracking-tight text-[#f2f3f5]">
            DTS Generator
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://ko-fi.com/yugutou"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:from-orange-500 hover:to-orange-600 active:scale-95"
          >
            ☕ Tip
          </a>
          <a
            href="#generator"
            className="rounded-full bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#5865F2]/30 transition-all hover:-translate-y-0.5 hover:bg-[#4752c4] hover:shadow-[#5865F2]/60 active:scale-95"
          >
            Generate now
          </a>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto w-full max-w-4xl px-4 pb-12 pt-16 text-center sm:pt-24">
        <div className="anim-fade-up mx-auto inline-flex items-center gap-2 rounded-full border border-[#5865F2]/30 bg-[#5865F2]/10 px-3.5 py-1.5 text-xs font-medium text-[#949cf7] [animation-delay:80ms]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#57F287]" />
          Free · No sign-up · 100% in your browser
        </div>
        <h1 className="anim-fade-up font-display rgb-title mx-auto mt-7 max-w-4xl cursor-default text-[34px] font-bold leading-[1.1] tracking-tight text-[#f2f3f5] [animation-delay:160ms] sm:text-6xl md:text-7xl">
          Discord timestamps,
          <br />
          <span className="gradient-text-animated">in everyone&rsquo;s timezone</span>
        </h1>
        <p className="anim-fade-up mx-auto mt-4 max-w-lg text-[13px] leading-relaxed text-[#949ba4] [animation-delay:220ms]">
          Pick a time, copy one line of code — everyone sees it in their own timezone, live.
        </p>
        {/* signature feature intro + quick jumps */}
        <div className="anim-fade-up mx-auto mt-5 max-w-lg [animation-delay:240ms]">
          <p className="text-[12px] leading-relaxed text-[#949ba4]">
            <span className="mr-1.5 rounded bg-[#57F287]/15 px-1.5 py-px text-[10px] font-bold text-[#57F287]">NEW</span>
            Hide a live timestamp inside any sentence — friends decode the riddle here.
          </p>
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5">
            <a
              href="#composer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#5865F2] px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#5865F2]/40 transition-all hover:-translate-y-0.5 hover:bg-[#4752c4] hover:shadow-[#5865F2]/60 active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Compose a riddle
            </a>
            <a
              href="#decoder"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#57F287]/50 bg-[#57F287]/10 px-5 py-2.5 text-xs font-semibold text-[#57F287] transition-all hover:-translate-y-0.5 hover:bg-[#57F287] hover:text-[#111214] hover:shadow-[0_0_20px_rgba(87,242,135,0.4)] active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              Translate a message
            </a>
          </div>
        </div>

        <LiveUnixBadge />
      </section>

      <TimestampTool />
      <TimestampDecoder />
      <SeoContent />
    </div>
  )
}
