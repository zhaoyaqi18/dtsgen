import type { TimestampStyle } from '@/lib/discordTime'

/**
 * Per-format neon accent palette — gives the format grid its
 * "skill panel" contrast instead of one flat blue.
 */
export const FORMAT_ACCENTS: Record<TimestampStyle | 'default', string> = {
  t: '#00C9FF', // cyan
  T: '#57F287', // green
  d: '#FEE75C', // yellow
  D: '#FF7A45', // coral
  f: '#5865F2', // blurple
  F: '#EB459E', // magenta
  R: '#9B5CFF', // violet
  default: '#9BA4B5', // silver
}
