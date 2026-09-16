// Theme system (FR-31) + night warmth (FR-32). Themes are CSS-var palettes applied to <html>.
import { getSetting, setSetting } from '../../lib/db/repo'

export type Theme = 'dark' | 'light' | 'sepia'

const PALETTES: Record<Theme, Record<string, string>> = {
  dark: { '--bg': '#0d0d0d', '--surface': '#1a1a1a', '--text': '#e0e0e0' },
  light: { '--bg': '#ffffff', '--surface': '#f2f2f2', '--text': '#111111' },
  sepia: { '--bg': '#f4ecd8', '--surface': '#e8dcc0', '--text': '#4a3f2f' },
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  const palette = PALETTES[theme]
  for (const [k, v] of Object.entries(palette)) root.style.setProperty(k, v)
  root.style.background = palette['--bg']
  root.style.color = palette['--text']
}

export async function loadTheme(): Promise<Theme> {
  const t = (await getSetting<Theme>('theme')) ?? 'dark'
  applyTheme(t)
  return t
}

export async function saveTheme(theme: Theme) {
  await setSetting('theme', theme)
  applyTheme(theme)
}

/** Night warmth: an amber overlay opacity based on a schedule (e.g. 21:00–07:00). */
export function warmthForHour(hour: number, startHour = 21, endHour = 7, strength = 0.15): number {
  const active = startHour > endHour ? hour >= startHour || hour < endHour : hour >= startHour && hour < endHour
  return active ? strength : 0
}
