'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applyTheme, getStoredTheme, THEME_STORAGE_KEY } from '@/lib/theme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const initial = getStoredTheme()
    setThemeState(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  const setTheme = useCallback((next) => {
    const value = next === 'dark' ? 'dark' : 'light'
    setThemeState(value)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
    applyTheme(value)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const value = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, value)
      } catch {
        /* ignore */
      }
      applyTheme(value)
      return value
    })
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, mounted }),
    [theme, setTheme, toggleTheme, mounted],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
