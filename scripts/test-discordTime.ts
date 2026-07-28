/**
 * Accuracy tests for the Discord timestamp core logic.
 * Run: npx tsx scripts/test-discordTime.ts
 */
import {
  wallTimeToUnixSeconds,
  getTimeZoneOffsetMs,
  buildSyntax,
  previewTimestamp,
  relativeString,
} from '../src/lib/discordTime'

let passed = 0
let failed = 0

function eq(actual: unknown, expected: unknown, label: string) {
  const ok = actual === expected
  if (ok) passed++
  else {
    failed++
    console.error(`✗ FAIL ${label}\n  expected: ${expected}\n  actual:   ${actual}`)
  }
  return ok
}

// --- 1. UTC baseline: the Unix epoch itself ---
eq(wallTimeToUnixSeconds(1970, 1, 1, 0, 0, 'UTC'), 0, 'epoch in UTC')

// --- 2. Known fixed-offset zone: Asia/Shanghai is always UTC+8 (no DST) ---
// 2026-07-28 20:00 in Shanghai == 2026-07-28 12:00 UTC
const expected1 = Math.floor(Date.UTC(2026, 6, 28, 12, 0, 0) / 1000)
eq(wallTimeToUnixSeconds(2026, 7, 28, 20, 0, 'Asia/Shanghai'), expected1, 'Shanghai UTC+8')

// --- 3. DST-aware zone: America/New_York ---
// Summer (EDT, UTC-4): 2026-07-01 12:00 NY == 16:00 UTC
eq(
  wallTimeToUnixSeconds(2026, 7, 1, 12, 0, 'America/New_York'),
  Math.floor(Date.UTC(2026, 6, 1, 16, 0, 0) / 1000),
  'New York summer EDT UTC-4',
)
// Winter (EST, UTC-5): 2026-01-15 12:00 NY == 17:00 UTC
eq(
  wallTimeToUnixSeconds(2026, 1, 15, 12, 0, 'America/New_York'),
  Math.floor(Date.UTC(2026, 0, 15, 17, 0, 0) / 1000),
  'New York winter EST UTC-5',
)

// --- 4. Half-hour zone: Asia/Kolkata UTC+5:30 ---
// 2026-03-10 18:00 Kolkata == 12:30 UTC
eq(
  wallTimeToUnixSeconds(2026, 3, 10, 18, 0, 'Asia/Kolkata'),
  Math.floor(Date.UTC(2026, 2, 10, 12, 30, 0) / 1000),
  'Kolkata UTC+5:30',
)

// --- 5. Cross-date-line: Pacific/Auckland NZDT UTC+13 in Jan 2026 ---
// 2026-01-05 09:00 Auckland == 2026-01-04 20:00 UTC (previous day!)
eq(
  wallTimeToUnixSeconds(2026, 1, 5, 9, 0, 'Pacific/Auckland'),
  Math.floor(Date.UTC(2026, 0, 4, 20, 0, 0) / 1000),
  'Auckland UTC+13 crosses date line',
)

// --- 6. Offset values themselves ---
eq(getTimeZoneOffsetMs('Asia/Shanghai', Date.UTC(2026, 6, 1)), 8 * 3600_000, 'offset Shanghai')
eq(getTimeZoneOffsetMs('America/New_York', Date.UTC(2026, 6, 1)), -4 * 3600_000, 'offset NY summer')
eq(getTimeZoneOffsetMs('America/New_York', Date.UTC(2026, 0, 1)), -5 * 3600_000, 'offset NY winter')

// --- 7. Syntax building ---
eq(buildSyntax(1753459200, 'F'), '<t:1753459200:F>', 'syntax F')
eq(buildSyntax(0, 't'), '<t:0:t>', 'syntax t at epoch')

// --- 8. Preview rendering matches Discord formats (en-US, UTC) ---
const epoch = 0
eq(
  previewTimestamp(epoch, 'F', 'en-US'),
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(0)),
  'preview F epoch',
)
eq(
  previewTimestamp(epoch, 'd', 'en-US'),
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(0)),
  'preview d epoch',
)

// --- 9. Relative strings ---
const nowMs = Date.UTC(2026, 6, 28, 0, 0, 0)
eq(relativeString(Math.floor(nowMs / 1000) + 3 * 86400, 'en-US', nowMs), 'in 3 days', 'relative +3d')
eq(relativeString(Math.floor(nowMs / 1000) - 2 * 3600, 'en-US', nowMs), '2 hours ago', 'relative -2h')

// --- 10. unix -> wall parts round-trips through the selected zone ---
import { unixSecondsToWallParts } from '../src/lib/discordTime'
{
  const u = wallTimeToUnixSeconds(2026, 7, 28, 20, 0, 'Asia/Shanghai')
  const w = unixSecondsToWallParts(u, 'Asia/Shanghai')
  eq(w.dateStr, '2026-07-28', 'wall date Shanghai')
  eq(w.timeStr, '20:00', 'wall time Shanghai')
  // same instant viewed from New York is 08:00 (EDT)
  const wny = unixSecondsToWallParts(u, 'America/New_York')
  eq(wny.timeStr, '08:00', 'wall time NY view of Shanghai 20:00')
  // Auckland 09:00 NZDT == previous day 20:00 UTC; wall parts in UTC must show prev day
  const ua = wallTimeToUnixSeconds(2026, 1, 5, 9, 0, 'Pacific/Auckland')
  eq(unixSecondsToWallParts(ua, 'UTC').dateStr, '2026-01-04', 'wall date UTC prev-day')
  // round-trip identity for a DST-boundary month
  const ub = wallTimeToUnixSeconds(2026, 3, 8, 1, 30, 'America/New_York')
  const wb = unixSecondsToWallParts(ub, 'America/New_York')
  eq(`${wb.dateStr} ${wb.timeStr}`, '2026-03-08 01:30', 'round-trip near DST gap')
}

// --- 11. DST boundary semantics (locked to Luxon-verified behavior) ---
{
  // Spring-forward GAP: NY 2026-03-08 02:30 does not exist -> forward-snap
  // to 03:30 EDT == 07:30 UTC (Luxon convention)
  eq(
    wallTimeToUnixSeconds(2026, 3, 8, 2, 30, 'America/New_York'),
    Math.floor(Date.UTC(2026, 2, 8, 7, 30, 0) / 1000),
    'spring gap snaps forward (NY 2:30 -> 3:30 EDT)',
  )
  // Fall-back OVERLAP: London 2026-10-25 01:30 happens twice; we take the
  // chronologically FIRST occurrence (BST, UTC+1) == 00:30 UTC
  eq(
    wallTimeToUnixSeconds(2026, 10, 25, 1, 30, 'Europe/London'),
    Math.floor(Date.UTC(2026, 9, 25, 0, 30, 0) / 1000),
    'fall overlap picks first occurrence (London)',
  )
  // Same rule in the southern hemisphere: Sydney 2026-04-05 02:30
  // -> first occurrence (AEDT, UTC+11) == 2026-04-04 15:30 UTC
  eq(
    wallTimeToUnixSeconds(2026, 4, 5, 2, 30, 'Australia/Sydney'),
    Math.floor(Date.UTC(2026, 3, 4, 15, 30, 0) / 1000),
    'fall overlap picks first occurrence (Sydney)',
  )
  // Southern spring gap: Sydney 2026-10-04 02:30 does not exist
  // -> forward-snap to 03:30 AEDT == 2026-10-03 16:30 UTC
  eq(
    wallTimeToUnixSeconds(2026, 10, 4, 2, 30, 'Australia/Sydney'),
    Math.floor(Date.UTC(2026, 9, 3, 16, 30, 0) / 1000),
    'spring gap snaps forward (Sydney 2:30 -> 3:30 AEDT)',
  )
  // Midnight-transition zones: clocks jump at 00:00 (Santiago spring
  // 2026-09-06), wall 00:00 does not exist -> 01:00 -03 == 04:00 UTC
  eq(
    wallTimeToUnixSeconds(2026, 9, 6, 0, 0, 'America/Santiago'),
    Math.floor(Date.UTC(2026, 8, 6, 4, 0, 0) / 1000),
    'midnight spring gap (Santiago)',
  )
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

/* ---------------- reverse parsing ---------------- */
import { parseTimestamps } from '../src/lib/discordTime'

// basic code with style
{
  const r = parseTimestamps('<t:1764000000:F>')
  eq(r.length, 1, 'parse: one code')
  eq(r[0].unix, 1764000000, 'parse: unix value')
  eq(r[0].style, 'F', 'parse: style')
  eq(r[0].raw, '<t:1764000000:F>', 'parse: raw')
}
// default syntax (no style)
{
  const r = parseTimestamps('<t:1764000000>')
  eq(r.length, 1, 'parse: default code')
  eq(r[0].style, null, 'parse: default style is null')
}
// bare number
{
  const r = parseTimestamps('starts at 1764000000 sharp')
  eq(r.length, 1, 'parse: bare number found')
  eq(r[0].unix, 1764000000, 'parse: bare unix')
}
// mixed announcement: 2 codes + 1 bare, in text order
{
  const r = parseTimestamps('raid <t:1764000000:R> then <t:1764100000:F> backup 1764200000 ok')
  eq(r.length, 3, 'parse: mixed count')
  eq(r[0].unix, 1764000000, 'parse: order 1')
  eq(r[1].unix, 1764100000, 'parse: order 2')
  eq(r[2].unix, 1764200000, 'parse: order 3')
  eq(r[2].style, null, 'parse: bare has no style')
}
// no double counting of digits inside codes
eq(parseTimestamps('<t:1764000000:F>').length, 1, 'parse: code digits not double counted')
// all 7 styles accepted
for (const st of ['t', 'T', 'd', 'D', 'f', 'F', 'R']) {
  eq(parseTimestamps(`<t:1000000000:${st}>`)[0]?.style, st, `parse: style ${st}`)
}
// invalid style → falls back to bare unix (time still decodes)
{
  const r = parseTimestamps('<t:1764000000:X>')
  eq(r.length, 1, 'parse: invalid style still decodes')
  eq(r[0].unix, 1764000000, 'parse: invalid style unix')
  eq(r[0].style, null, 'parse: invalid style → null')
}
// false-positive guards
eq(parseTimestamps('20260728').length, 0, 'parse: 8-digit date not a timestamp')
eq(parseTimestamps('123456789012').length, 0, 'parse: 12 digits too long')
eq(parseTimestamps('no numbers here').length, 0, 'parse: plain text → empty')
eq(parseTimestamps('').length, 0, 'parse: empty string')
eq(parseTimestamps('<t:abc>').length, 0, 'parse: non-numeric code → empty')
// epoch and future extremes within range
eq(parseTimestamps('<t:0:f>')[0]?.unix, 0, 'parse: epoch zero')
eq(parseTimestamps('<t:99999999999:F>')[0]?.unix, 99999999999, 'parse: 11-digit max')
// adjacent codes
{
  const r = parseTimestamps('<t:1111111111:R><t:2222222222:R>')
  eq(r.length, 2, 'parse: adjacent codes')
}
// round-trip: everything buildSyntax produces must parse back identically
for (const st of ['t', 'T', 'd', 'D', 'f', 'F', 'R'] as const) {
  const syntax = buildSyntax(1764000000, st)
  const r = parseTimestamps(syntax)
  eq(r.length === 1 && r[0].unix === 1764000000 && r[0].style === st, true, `parse: round-trip ${st}`)
}
eq(parseTimestamps('<t:1764000000>')[0]?.unix, 1764000000, 'parse: round-trip default syntax')

console.log(`\ntotal ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
// boundary guards for bare numbers
eq(parseTimestamps('123456789012').length, 0, 'parse: 12-digit run fully rejected')
eq(parseTimestamps('x1764000000')[0]?.unix, 1764000000, 'parse: letter-prefixed number ok')
eq(parseTimestamps('17640000005').length, 1, 'parse: 11 digits is valid max')
eq(parseTimestamps('176400000050').length, 0, 'parse: 12-digit run rejected')

/* ---------------- message composer ---------------- */
import { composeMessage } from '../src/lib/discordTime'

eq(composeMessage('我在第一次见面的地方等你', 1764000000, 'F'),
   '我在第一次见面的地方等你 <t:1764000000:F>', 'compose: append at end')
eq(composeMessage('{time}，我在老地方等你', 1764000000, 'F'),
   '<t:1764000000:F>，我在老地方等你', 'compose: placeholder at start')
eq(composeMessage('raid {time} sharp, meeting {time} too', 1764000000, 'R'),
   'raid <t:1764000000:R> sharp, meeting <t:1764000000:R> too', 'compose: multiple placeholders')
eq(composeMessage('', 1764000000, 'f'), '', 'compose: empty template → empty')
eq(composeMessage('   ', 1764000000, 'f'), '', 'compose: whitespace template → empty')
eq(composeMessage('  padded  ', 1764000000, 't'), 'padded <t:1764000000:t>', 'compose: trims template')
eq(composeMessage('{time}', 1764000000, 'D'), '<t:1764000000:D>', 'compose: bare placeholder')
for (const st of ['t', 'T', 'd', 'D', 'f', 'F', 'R'] as const) {
  eq(composeMessage('x {time}', 1764000000, st), `x <t:1764000000:${st}>`, `compose: style ${st}`)
}
// composed messages must be fully decodable by parseTimestamps
{
  const msg = composeMessage('meet {time} or {time}', 1764000000, 'F')
  const r = parseTimestamps(msg)
  eq(r.length, 2, 'compose: both codes parse back')
  eq(r[0].unix, 1764000000, 'compose: round-trip unix')
}

console.log(`\ntotal ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

/* ---------------- whole-message translation ---------------- */
import { translateTimestamps } from '../src/lib/discordTime'

const T0 = Date.UTC(2026, 6, 28, 12, 0, 0) // fixed "now" for deterministic output
{
  const r = translateTimestamps('meet <t:1764000000:F> ok', 'en-US', T0)
  eq(r.count, 1, 'translate: one code')
  eq(r.text, `meet ${previewTimestamp(1764000000, 'F', 'en-US', T0)} ok`, 'translate: in-place replacement')
}
{
  const r = translateTimestamps('a <t:1764000000:R> b <t:1764100000:t> c', 'en-US', T0)
  eq(r.count, 2, 'translate: two codes')
  eq(
    r.text,
    `a ${previewTimestamp(1764000000, 'R', 'en-US', T0)} b ${previewTimestamp(1764100000, 't', 'en-US', T0)} c`,
    'translate: styles preserved per code',
  )
}
{
  const r = translateTimestamps('starts 1764000000 sharp', 'en-US', T0)
  eq(r.count, 1, 'translate: bare number')
  eq(r.text, `starts ${previewTimestamp(1764000000, 'F', 'en-US', T0)} sharp`, 'translate: bare uses F style')
}
{
  const r = translateTimestamps('x <t:1:t> mid 2222222222 y <t:3:D> z', 'en-US', T0)
  eq(r.count, 3, 'translate: codes + bare between them')
  eq(r.text.includes('2222222222'), false, 'translate: bare replaced')
}
eq(translateTimestamps('nothing here', 'en-US', T0).count, 0, 'translate: plain text count 0')
eq(translateTimestamps('nothing here', 'en-US', T0).text, 'nothing here', 'translate: plain text unchanged')
eq(translateTimestamps('', 'en-US', T0).count, 0, 'translate: empty input')
// digits inside codes never double-translated
eq(translateTimestamps('<t:1764000000:F>', 'en-US', T0).count, 1, 'translate: no double count')
// default-style code renders as F
eq(
  translateTimestamps('<t:1764000000>', 'en-US', T0).text,
  previewTimestamp(1764000000, 'F', 'en-US', T0),
  'translate: default syntax → F',
)

console.log(`\ntotal ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
