export const THEME_STORAGE_KEY = 'dermatics-theme'

export function getStoredTheme() {
  if (typeof window === 'undefined') return 'light'
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
}
