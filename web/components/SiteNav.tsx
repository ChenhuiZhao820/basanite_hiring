'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/Logo'
import { REGISTER_INTEREST_URL } from '@/lib/links'

// Shared marketing navigation. Rendered identically on every public page so
// the header never shifts as visitors move between the landing page and the
// pricing / comparisons / about / blog routes. Internal links use hash-scroll
// targets prefixed with "/" so they resolve from any page back to the home
// page anchors.
const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/methodology', label: 'Methodology' },
  { href: '/compare', label: 'Comparisons' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact Us' },
]

// Value story split across two destinations: the impact / ROI calculator
// section on the homepage, and the assumptions + levers page behind it.
const VALUE_LINKS: { href: string; label: string }[] = [
  { href: '/#roi-calculator', label: 'What you get back' },
  { href: '/value', label: 'Assumptions behind your number' },
]

// Product anchors grouped under the "Product" dropdown in the desktop nav and
// under a "Product" heading in the mobile menu. Both point at homepage
// sections: "The process" (#how-it-works) and the demo video (#demo).
const PRODUCT_LINKS: { href: string; label: string }[] = [
  { href: '/#how-it-works', label: 'Basanite Agent' },
  { href: '/#demo', label: 'Watch Demo' },
]

// Secondary pages grouped under the "Resources" dropdown in the desktop nav
// and under a "Resources" heading in the mobile menu.
const RESOURCE_LINKS: { href: string; label: string }[] = [
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
]

// Hover/focus dropdown used for grouped links in the desktop nav. Pure CSS
// (group-hover / group-focus-within) so no client state is needed.
function NavDropdown({ label, links }: { label: string; links: { href: string; label: string }[] }) {
  return (
    <div className="relative group">
      <button
        type="button"
        aria-haspopup="true"
        className="flex items-center gap-1 hover:text-basanite-900 transition-colors"
      >
        {label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="transition-transform group-hover:rotate-180"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 hidden group-hover:block group-focus-within:block">
        <div className="min-w-[10rem] bg-earth-50/95 backdrop-blur-md border border-earth-200/60 shadow-lg py-2">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-2 hover:text-basanite-900 hover:bg-earth-100/60 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SiteNav() {
  const [banner, setBanner] = useState<{ kind: 'error' | 'info'; msg: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    const info = params.get('info')
    if (err) setBanner({ kind: 'error', msg: err })
    else if (info) setBanner({ kind: 'info', msg: info })
  }, [])

  function dismiss() {
    setBanner(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    url.searchParams.delete('info')
    window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams : ''))
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-earth-50/85 backdrop-blur-md border-b border-earth-200/60">
      {banner && (
        <div
          className={
            banner.kind === 'error'
              ? 'bg-red-50 border-b border-red-200 text-red-800'
              : 'bg-amber-50 border-b border-amber-200 text-amber-900'
          }
        >
          <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4 text-sm">
            <span className="flex-1">{banner.msg}</span>
            <div className="flex items-center gap-4 shrink-0">
              <a href="/logout" className="underline font-medium hover:opacity-80">
                Sign out
              </a>
              <button onClick={dismiss} aria-label="Dismiss" className="text-lg leading-none hover:opacity-70">
                &times;
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={26} dark />
          <span className="font-display text-basanite-900 text-lg">Basanite</span>
        </Link>
        <div className="hidden sm:flex items-center gap-7 text-sm text-basanite-600">
          <NavDropdown label="Product" links={PRODUCT_LINKS} />
          <NavDropdown label="Value" links={VALUE_LINKS} />
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} className="hover:text-basanite-900 transition-colors">
              {link.label}
            </Link>
          ))}
          <NavDropdown label="Resources" links={RESOURCE_LINKS} />
        </div>
        <div className="flex items-center gap-3">
          <a
            href={REGISTER_INTEREST_URL}
            className="text-sm font-semibold text-earth-50 bg-basanite-900 px-4 py-2 hover:bg-gold-600 transition-colors duration-200"
          >
            Register interest
          </a>
          <a
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-basanite-600 hover:text-basanite-900 transition-colors duration-200"
          >
            Sign in
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="sm:hidden -mr-1 inline-flex items-center justify-center p-2 text-basanite-700 hover:text-basanite-900 transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="sm:hidden border-t border-earth-200/60 bg-earth-50/95 backdrop-blur-md"
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col text-base text-basanite-700">
            <span className="pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wide text-basanite-500">
              Product
            </span>
            {PRODUCT_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 pl-3 border-b border-earth-200/40 last:border-0 hover:text-basanite-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <span className="pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wide text-basanite-500">
              Value
            </span>
            {VALUE_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 pl-3 border-b border-earth-200/40 last:border-0 hover:text-basanite-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 border-b border-earth-200/40 last:border-0 hover:text-basanite-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <span className="pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wide text-basanite-500">
              Resources
            </span>
            {RESOURCE_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 pl-3 border-b border-earth-200/40 last:border-0 hover:text-basanite-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="py-2.5 font-medium hover:text-basanite-900 transition-colors"
            >
              Sign in
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
