import { FORMAT_ACCENTS } from '@/lib/palette'
import type { TimestampStyle } from '@/lib/discordTime'

const FORMAT_ROWS: { code: TimestampStyle; name: string; example: string }[] = [
  { code: 't', name: 'Short Time', example: '4:12 PM' },
  { code: 'T', name: 'Long Time', example: '4:12:30 PM' },
  { code: 'd', name: 'Short Date', example: '04/22/2026' },
  { code: 'D', name: 'Long Date', example: 'April 22, 2026' },
  { code: 'f', name: 'Short Date/Time', example: 'April 22, 2026 4:12 PM' },
  { code: 'F', name: 'Long Date/Time', example: 'Wednesday, April 22, 2026 4:12 PM' },
  { code: 'R', name: 'Relative Time', example: 'in 3 days' },
]

const STEP_ACCENTS = ['#5865F2', '#EB459E', '#57F287']

const FAQS = [
  {
    q: 'What is a Discord timestamp?',
    a: 'A Discord timestamp is a piece of markdown code like <t:1753459200:F> that Discord renders as a dynamic, localized time. Instead of writing "8 PM EST" and confusing international members, every viewer automatically sees the moment converted to their own timezone and language.',
  },
  {
    q: 'How do I use the generated code?',
    a: 'Pick your date and time above, click any format card to copy its code, then paste it directly into a Discord message, embed, or bot reply. Discord converts it into a live timestamp the moment you send — no bot or permissions required.',
  },
  {
    q: 'Which format should I use?',
    a: 'F (Long Date/Time) is the most common choice for event announcements. Use R (Relative Time) for countdowns — it displays "in 2 hours" and updates live as the event approaches. Use D or d for date-only deadlines.',
  },
  {
    q: 'Why does everyone see a different time?',
    a: 'That is the whole point. The code stores a single absolute moment (a Unix timestamp in UTC). Each Discord client converts it to the viewer\'s local timezone, so a member in London and a member in Tokyo both see the correct local time for the same event.',
  },
  {
    q: 'Do timestamps work on mobile and in threads or embeds?',
    a: 'Yes. Timestamps work on desktop, iOS, and Android, and they render in regular messages, threads, forum posts, bot messages, and embed descriptions.',
  },
  {
    q: 'How do I read a timestamp code someone sent me?',
    a: 'Paste it into the Timestamp Decoder above. It works with full codes like <t:1764547200:F>, default codes like <t:1764547200>, and bare Unix numbers — even a whole announcement message at once. Every timestamp is shown as your local time plus a live relative reading like "in 3 days".',
  },
  {
    q: 'What is a Unix timestamp?',
    a: 'It is the number of seconds elapsed since January 1, 1970 (UTC). It is timezone-independent, which is exactly why Discord uses it: one number describes one absolute moment for everyone on Earth.',
  },
]

export default function SeoContent() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24">
      {/* How to use */}
      <section className="mt-20">
        <h2 className="font-display text-2xl font-bold text-[#f2f3f5] sm:text-3xl">
          How to create a Discord timestamp
        </h2>
        <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
          {/* gradient connector line (desktop) */}
          <div
            aria-hidden="true"
            className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-transparent via-[#5865F2]/50 to-transparent sm:block"
          />
          {[
            { n: '1', t: 'Pick your date & time', d: 'Select the event moment above. Your timezone is auto-detected — switch it if you are scheduling for another region.' },
            { n: '2', t: 'Click a format to copy', d: 'Seven formats are generated instantly. F is best for announcements, R for live countdowns.' },
            { n: '3', t: 'Paste into Discord', d: 'Drop the code into any message. Every viewer sees it converted to their own timezone automatically.' },
          ].map((s, i) => (
            <div
              key={s.n}
              className="card-shine relative rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#5865F2]/40 hover:shadow-[0_12px_40px_rgba(88,101,242,0.2)]"
            >
              <div
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white ring-4 ring-[#111214]"
                style={{
                  background: `linear-gradient(135deg, ${STEP_ACCENTS[i]}, ${STEP_ACCENTS[i]}99)`,
                  boxShadow: `0 6px 18px ${STEP_ACCENTS[i]}55`,
                }}
              >
                {s.n}
              </div>
              <h3 className="mt-3.5 text-[15px] font-semibold text-[#f2f3f5]">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#949ba4]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Format table */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-[#f2f3f5] sm:text-3xl">All 7 Discord timestamp formats</h2>
        <p className="mt-2 text-sm text-[#949ba4]">
          The letter at the end of the code controls how Discord displays the time. Omitting it defaults to <code className="rounded bg-white/10 px-1 font-mono text-xs">f</code>.
        </p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/8">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/[0.04] text-xs uppercase tracking-wider text-[#949ba4]">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Format</th>
                <th className="px-4 py-3 font-semibold">Syntax</th>
                <th className="px-4 py-3 font-semibold">Example output</th>
              </tr>
            </thead>
            <tbody>
              {FORMAT_ROWS.map((r, i) => (
                <tr key={r.code} className={`transition-colors hover:bg-white/[0.06] ${i % 2 === 0 ? 'bg-white/[0.015]' : 'bg-white/[0.04]'}`}>
                  <td className="px-4 py-3">
                    <code
                      className="rounded px-1.5 py-0.5 font-mono text-xs font-bold"
                      style={{
                        color: FORMAT_ACCENTS[r.code],
                        background: `color-mix(in srgb, ${FORMAT_ACCENTS[r.code]} 16%, transparent)`,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${FORMAT_ACCENTS[r.code]} 40%, transparent)`,
                      }}
                    >
                      {r.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-[#dbdee1]">{r.name}</td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-[#949ba4]">{`<t:UNIX:${r.code}>`}</code>
                  </td>
                  <td className="px-4 py-3 text-[#dbdee1]">{r.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-[#f2f3f5] sm:text-3xl">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 open:border-[#5865F2]/40 open:bg-[#5865F2]/[0.06]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-[#dbdee1] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="ml-4 shrink-0 text-[#5865F2] transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#949ba4]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mt-16 border-t border-white/8 pt-6 text-center text-xs text-[#6d6f78]">
        DTS Generator — Free Discord Timestamp Tool. Works entirely in your browser. No sign-up, no uploads, no tracking.
        <br className="sm:hidden" />
        {' '}<a href="https://tally.so/r/PdW5lx" target="_blank" rel="noopener" className="text-[#5865F2] hover:underline">Feedback</a>
      </footer>
    </div>
  )
}
