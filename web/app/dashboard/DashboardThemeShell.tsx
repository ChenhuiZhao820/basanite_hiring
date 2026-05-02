'use client'

// Wraps the dashboard in the ThemeProvider so dark-mode preference applies
// across all dashboard routes. Also paints the layout chrome (background,
// nav border, brand text) so flipping the toggle has an immediate visible
// effect even on routes whose internal cards still ship light-only.

import { ThemeProvider } from '@/lib/theme'
import { LogoMark } from '@/components/Logo'
import { LegalFooter } from '@/components/LegalFooter'
import DashboardNav from './DashboardNav'

type Props = {
  email: string
  isAdmin: boolean
  children: React.ReactNode
}

export function DashboardThemeShell({ email, isAdmin, children }: Props) {
  return (
    <ThemeProvider storageKey="basanite-dashboard-theme" defaultTheme="light">
      <div className="min-h-screen bg-earth-50 dark:bg-basanite-900 transition-colors duration-150">
        <nav className="bg-white dark:bg-basanite-950 border-b border-earth-200 dark:border-basanite-800 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <a href="/dashboard" className="flex items-center gap-2">
              <LogoMark size={24} dark />
              <span className="font-semibold text-basanite-900 dark:text-earth-100 text-sm">Basanite</span>
            </a>
            <DashboardNav email={email} isAdmin={isAdmin} />
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <LegalFooter />
        </div>
      </div>
    </ThemeProvider>
  )
}
