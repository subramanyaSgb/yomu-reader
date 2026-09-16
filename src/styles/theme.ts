export type Theme = 'dark' | 'light' | 'sepia'

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('yomu-theme', theme)
}

export function loadStoredTheme() {
  const t = localStorage.getItem('yomu-theme') as Theme | null
  applyTheme(t ?? 'dark')
  return t ?? 'dark'
}
