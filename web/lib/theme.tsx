'use client'

// Scoped theme provider. Adds/removes a `dark` class on its own wrapper
// element (NOT <html>), so dark mode stays scoped to wherever this is
// mounted. We use it both in the candidate-screening flow and in the
// hirer dashboard, with separate localStorage keys so the two surfaces
// can hold independent preferences.

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
})

type Props = {
  children: React.ReactNode
  /** localStorage key — surface-specific so screening + dashboard don't fight. */
  storageKey?: string
  defaultTheme?: Theme
}

export function ThemeProvider({
  children,
  storageKey = 'basanite-screening-theme',
  defaultTheme = 'dark',
}: Props) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved === 'light' || saved === 'dark') setTheme(saved)
    } catch {
      // localStorage blocked — fall back to default.
    }
  }, [storageKey])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, theme)
    } catch { /* ignore */ }
  }, [theme, storageKey])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      <div className={theme === 'dark' ? 'dark' : ''}>{children}</div>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
