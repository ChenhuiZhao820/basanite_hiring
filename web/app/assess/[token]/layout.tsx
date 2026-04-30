// Server-component layout wrapping the candidate-screening flow. Mounts the
// ThemeProvider (default dark) and a fixed-position theme toggle in the
// top-right of every page. The interview route hides the floating toggle and
// hosts its own inside the InterviewHeader.

import { ThemeProvider } from '@/lib/theme'
import FloatingThemeToggle from '@/components/FloatingThemeToggle'

export default function AssessLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark">
      <FloatingThemeToggle />
      {children}
    </ThemeProvider>
  )
}
