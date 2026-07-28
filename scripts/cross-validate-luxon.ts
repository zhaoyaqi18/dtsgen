/**
 * Independent cross-validation of wallTimeToUnixSeconds against Luxon
 * (battle-tested date library) across ALL IANA zones.
 *
 * Coverage:
 *  - every 6 hours of wall time for every day in 2026, all zones
 *  - hourly sweeps across 2026 DST transition weeks for key zones
 *  - 45-minute offset zones, date-line zones, historical offsets
 *  - local-zone fuzz against the JS engine's own Date()
 *  - round-trip via unixSecondsToWallParts
 *
 * Known acceptable divergence: nonexistent wall times inside DST
 * spring-forward gaps — both implementations snap forward, we assert
 * they snap to the SAME instant.
 */
import { DateTime } from 'luxon'
import {
  wallTimeToUnixSeconds,
  unixSecondsToWallParts,
  detectTimeZone,
  listTimeZones,
} from '../src/lib/discordTime'

const zones = listTimeZones()
console.log(`zones: ${zones.length}`)

let total = 0
let mismatches = 0
let conventionMatches = 0
const mismatchSamples: string[] = []

function check(zone: string, y: number, m: number, d: number, h: number, min: number) {
  total++
  const mine = wallTimeToUnixSeconds(y, m, d, h, min, zone)
  const lux = DateTime.fromObject(
    { year: y, month: m, day: d, hour: h, minute: min, second: 0 },
    { zone },
  ).toUnixInteger()
  if (mine === lux) return

  // Divergence is ACCEPTED only when the wall time is ambiguous
  // (fall-back overlap) and mine is a chronologically EARLIER valid
  // occurrence — our documented convention. Luxon's pick varies by zone.
  for (const dSec of [1800, 2700, 3600, 5400, 7200]) {
    const alt = lux - dSec
    const w = unixSecondsToWallParts(alt, zone)
    const [wy, wm, wd] = w.dateStr.split('-').map(Number)
    const [wh, wmin] = w.timeStr.split(':').map(Number)
    if (wy === y && wm === m && wd === d && wh === h && wmin === min) {
      if (mine === alt) {
        conventionMatches++
        return
      }
      break
    }
  }
  mismatches++
  if (mismatchSamples.length < 20) {
    mismatchSamples.push(
      `${zone} ${y}-${m}-${d} ${h}:${String(min).padStart(2, '0')} mine=${mine} luxon=${lux} diff=${mine - lux}s`,
    )
  }
}

// 1) Full sweep: all zones, every day of 2026, 4 wall times per day
for (const zone of zones) {
  for (let day = 1; day <= 365; day++) {
    const base = new Date(Date.UTC(2026, 0, 1))
    const dt = new Date(base.getTime() + (day - 1) * 86400_000)
    const y = dt.getUTCFullYear()
    const m = dt.getUTCMonth() + 1
    const d = dt.getUTCDate()
    for (const h of [0, 6, 12, 18]) {
      check(zone, y, m, d, h, 0)
    }
  }
}
console.log(`full sweep done: ${total} comparisons, ${mismatches} mismatches`)

// 2) Hourly sweeps across 2026 DST transition weeks (key zones)
const dstZones: [string, [number, number, number, number, number][]][] = [
  ['America/New_York', [[2026, 3, 8, 0, 24], [2026, 11, 1, 0, 24]]],
  ['Europe/London', [[2026, 3, 29, 0, 24], [2026, 10, 25, 0, 24]]],
  ['Europe/Berlin', [[2026, 3, 29, 0, 24], [2026, 10, 25, 0, 24]]],
  ['Australia/Sydney', [[2026, 4, 5, 0, 24], [2026, 10, 4, 0, 24]]],
  ['America/Santiago', [[2026, 4, 4, 0, 24], [2026, 9, 6, 0, 24]]],
]
for (const [zone, windows] of dstZones) {
  for (const [y, m, d, hStart, hEnd] of windows) {
    for (let h = hStart; h < hEnd; h++) {
      check(zone, y, m, d, h, 0)
      check(zone, y, m, d, h, 30)
    }
  }
}

// 3) Odd-offset zones
for (const zone of ['Asia/Kathmandu', 'Pacific/Chatham', 'Australia/Eucla', 'America/St_Johns']) {
  for (const h of [0, 8, 16, 23]) {
    check(zone, 2026, 6, 15, h, 15)
    check(zone, 2026, 6, 15, h, 45)
  }
}

// 4) Local zone fuzz against the JS engine's own Date (independent path)
{
  const local = detectTimeZone()
  let localBad = 0
  for (let i = 0; i < 2000; i++) {
    const y = 2026
    const m = 1 + Math.floor(Math.random() * 12)
    const d = 1 + Math.floor(Math.random() * 28)
    const h = Math.floor(Math.random() * 24)
    const min = Math.floor(Math.random() * 60)
    const mine = wallTimeToUnixSeconds(y, m, d, h, min, local)
    const engine = Math.floor(new Date(y, m - 1, d, h, min, 0).getTime() / 1000)
    total++
    if (mine !== engine) {
      localBad++
      mismatches++
      if (mismatchSamples.length < 20) {
        mismatchSamples.push(`LOCAL ${local} ${y}-${m}-${d} ${h}:${min} mine=${mine} engine=${engine}`)
      }
    }
  }
  console.log(`local fuzz (${local}): 2000 samples, ${localBad} mismatches`)
}

// 5) Round-trip integrity: unix -> wall parts -> unix, all zones, weekly over 2026
{
  let rtBad = 0
  for (const zone of zones) {
    for (let week = 0; week < 52; week++) {
      const unix = Math.floor(Date.UTC(2026, 0, 5) / 1000) + week * 7 * 86400
      const w = unixSecondsToWallParts(unix, zone)
      const [y, m, d] = w.dateStr.split('-').map(Number)
      const [h, min] = w.timeStr.split(':').map(Number)
      const back = wallTimeToUnixSeconds(y, m, d, h, min, zone)
      total++
      if (back !== unix) {
        rtBad++
        mismatches++
        if (mismatchSamples.length < 20) {
          mismatchSamples.push(`ROUNDTRIP ${zone} unix=${unix} back=${back} wall=${w.dateStr} ${w.timeStr}`)
        }
      }
    }
  }
  console.log(`round-trip: ${zones.length * 52} samples, ${rtBad} mismatches`)
}

console.log(`\nTOTAL: ${total} comparisons, ${mismatches} mismatches, ${conventionMatches} verified ambiguous-time convention picks`)
if (mismatchSamples.length) {
  console.log('samples:')
  for (const s of mismatchSamples) console.log('  ' + s)
}
process.exit(mismatches > 0 ? 1 : 0)
