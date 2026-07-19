import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // lib/ holds dynamically-composed class maps (e.g. TIER_META in
    // recommendation.ts) that reach JSX only via `${meta.bg}` template
    // literals. Without this glob, JIT never sees those literals, so the
    // less-common dark: variants (dark:text-red-100, dark:bg-emerald-900/20,
    // …) are silently purged — which rendered the routing-recommendation
    // banner as near-black text on a dark-red background in dark mode.
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Class-based dark mode so we can scope it to specific subtrees
  // (the candidate-screening flow) instead of the whole app.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cool dark-stone palette — primary surface + body text.
        // Originally only had 500-950; extended with 50-400 in 2026-05
        // because dark-mode text variants needed lighter shades on the
        // light-text side (text-basanite-400 was being used in
        // light-mode AND undefined, causing fallback to browser default).
        basanite: {
          50: '#f5f3f1',
          100: '#e6e1da',
          200: '#d3ccc1',
          300: '#b3a99e',
          400: '#847d72',
          500: '#6b665e',
          600: '#524e48',
          700: '#3d3a36',
          800: '#2d2b28',
          850: '#252320',  // intermediate for layered card surfaces in dark mode
          900: '#1a1a18',
          950: '#0f0f0e',
        },
        gold: {
          300: '#e8c555',
          400: '#d4a843',
          500: '#c49a2f',
          600: '#a6821f',
          700: '#8a6c1a',
        },
        // Warm terracotta/rust — added 2026-07 for the "leak" ribbons in the
        // savings-flow (Sankey) diagram. Sits harmoniously between the warm
        // earth tones and gold; reads as "cost draining away".
        clay: {
          300: '#d6a06f',
          400: '#c37d4e',
          500: '#b05c39',
          600: '#93472f',
          700: '#733728',
        },
        // Warm cream/sand — used for accents and dark-mode text on basanite.
        // Originally only 50-300; extended with 400-900 for dark-mode
        // text contrast (dark:text-earth-400/500/600/etc were undefined).
        earth: {
          50: '#faf8f5',
          100: '#f3efe8',
          200: '#e8e2d8',
          300: '#d4cdc0',
          400: '#b9b09f',
          500: '#998e75',
          600: '#79705c',
          700: '#5b5446',
          800: '#3e3a30',
          900: '#25221c',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradientShift 8s ease infinite',
        'marquee': 'marquee 45s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
