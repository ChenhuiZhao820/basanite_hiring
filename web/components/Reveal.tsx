'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'

// Scroll-reveal wrapper mirroring the homepage's useReveal() pattern: fades
// and rises into view once, then disconnects. Lets server-rendered marketing
// pages opt into the site's motion language without becoming client
// components themselves. `as` picks the rendered tag (default <div>) so
// sections keep their semantics.
export function Reveal({
  as,
  className = '',
  delay,
  id,
  children,
}: {
  as?: ElementType
  className?: string
  delay?: number
  id?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('visible')
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          obs.disconnect()
        }
      },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const Tag = (as ?? 'div') as ElementType
  return (
    <Tag
      ref={ref}
      id={id}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
