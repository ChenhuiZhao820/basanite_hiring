'use client'

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { LogoMark } from '@/components/Logo'
import { AuthFragmentHandler } from '@/components/AuthFragmentHandler'
import { DimensionsRadar } from '@/components/DimensionsRadar'
import { ImpactSection } from '@/components/ImpactSection'
import { HowItWorksSlider } from '@/components/HowItWorksSlider'
import { StoneTexture } from '@/components/StoneTexture'
import { SiteNav } from '@/components/SiteNav'
import { REGISTER_INTEREST_URL } from '@/lib/links'

const HERO_VIDEO = '/bsnt_vid.mp4'

// ─── Scroll reveal hook ──────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect() } },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ─── Hero (original full-bleed) ─────────────────────────────────────────
function Hero() {
  // Above the fold, so the entrance cascade fires on mount rather than on
  // scroll. .hero-in unlocks the staggered .hero-item animations; each item
  // carries its own --d delay to arrive top-to-bottom.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <section className="pt-16 min-h-screen flex flex-col">
      <div className="relative w-full flex-1 overflow-hidden">
        <video
          src={HERO_VIDEO}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-basanite-900/70" />
        <div className={`absolute inset-0 flex flex-col items-center px-6 text-center ${entered ? 'hero-in' : ''}`}>
          <div className="flex-1 flex flex-col items-center justify-center">
          <svg width="40" height="54" viewBox="0 0 40 54" fill="none" aria-hidden="true" className="hero-item mb-8" style={{ ['--d' as string]: '0ms' }}>
            <path d="M20 0 L0 18 L20 18 Z" fill="#e8c555" />
            <path d="M20 0 L40 18 L20 18 Z" fill="#d4a843" />
            <path d="M0 18 L20 18 L20 54 Z" fill="#c49a2f" />
            <path d="M40 18 L20 18 L20 54 Z" fill="#a87f24" />
            <path d="M0 18 L40 18" stroke="#1a1a18" strokeOpacity="0.18" strokeWidth="0.5" />
          </svg>
          <p className="hero-item text-gold-500 text-[11px] font-semibold uppercase tracking-[0.22em] mb-8" style={{ ['--d' as string]: '80ms' }}>
            Talent selection with Basanite
          </p>
          <h1 className="hero-item font-display text-earth-50 text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1] mb-14 max-w-5xl" style={{ ['--d' as string]: '160ms' }}>
            Hire the right person,{' '}
            <em className="text-gold-400">faster</em>
          </h1>
          <p className="hero-item text-earth-200 text-base md:text-lg max-w-lg leading-relaxed mb-8 text-justify [text-align-last:justify]" style={{ ['--d' as string]: '380ms' }}>
            AI-enhanced interviews for more informed and faster hiring,
            measuring genuine capability, not performed competence.
          </p>
          <a
            href="#demo"
            className="hero-item text-gold-400 hover:text-gold-300 text-lg md:text-xl font-medium tracking-wide underline underline-offset-8 decoration-gold-500/50 hover:decoration-gold-300 transition-colors duration-200"
            style={{ ['--d' as string]: '520ms' }}
          >
            See it run
          </a>
          </div>
          <div className="hero-item w-full pb-8" style={{ ['--d' as string]: '680ms' }}>
            <div className="flex flex-wrap items-center justify-center gap-x-7 sm:gap-x-10 gap-y-3">
              {SOCIAL_PROOF.map(item => (
                <div key={item.alt} className="flex w-28 flex-col items-center gap-1 text-center">
                  <div className="flex h-6 items-center">
                    <img
                      src={item.src}
                      alt={item.alt}
                      className={`${item.logoClass} w-auto select-none opacity-90`}
                      draggable={false}
                    />
                  </div>
                  <span className="text-earth-300 text-[10px] leading-snug">{item.caption}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Social proof: backed & recognised by (rendered inside the hero) ──────
const SOCIAL_PROOF: { src: string; alt: string; caption: string; logoClass: string }[] = [
  {
    src: '/logos/yc.svg',
    alt: 'Y Combinator',
    caption: 'Top 10% of S26 applicants',
    logoClass: 'h-5 sm:h-6',
  },
  {
    src: '/logos/redwood-founders.svg',
    alt: 'Redwood Founders',
    caption: 'Backed by Redwood Founders',
    logoClass: 'h-5 sm:h-6',
  },
  {
    src: '/logos/university-of-manchester.png',
    alt: 'The University of Manchester',
    caption: 'Masood Entrepreneurship Centre',
    logoClass: 'h-4 sm:h-5',
  },
  {
    src: '/logos/stripe.svg',
    alt: 'Stripe',
    caption: 'Partnered with Stripe VC',
    logoClass: 'h-4 sm:h-5',
  },
]

// ─── What is Basanite · animated process flow ────────────────────────────
// The visualization leads: today's typical process draws itself first,
// then the three early rounds are swapped out for a single gold Basanite
// interview node while the rest of the pipeline closes the gap. The copy
// comes after the chart.
const FLOW_CAPTION_RED_BROWN = '#c98a6b'

const EARLY_ROUNDS = [
  { label: 'Phone screen', caption: 'rehearsable', delay: 0 },
  { label: 'Coding test', caption: 'AI passes it', delay: 200 },
  { label: 'First tech interview', caption: 'wrong signal', delay: 400 },
]

function FlowArrow({ delay }: { delay: number }) {
  return (
    <span
      aria-hidden="true"
      className="flow-item text-basanite-300 text-2xl select-none rotate-90 py-1.5 min-[880px]:rotate-0 min-[880px]:py-0 min-[880px]:self-start min-[880px]:pt-4 min-[880px]:px-3"
      style={{ ['--d' as string]: `${delay}ms` }}
    >
      &rarr;
    </span>
  )
}

function FlowNode({ label, caption, dim, delay }: { label: string; caption?: string; dim?: boolean; delay: number }) {
  return (
    <div className="flow-item flex flex-col items-center gap-2" style={{ ['--d' as string]: `${delay}ms` }}>
      <div
        className={`border px-6 py-3.5 text-lg text-center leading-snug whitespace-nowrap ${
          dim ? 'border-earth-300 bg-white text-basanite-500' : 'border-basanite-200 bg-white text-basanite-800'
        }`}
      >
        {label}
      </div>
      {caption && (
        <span className="text-xs italic leading-snug" style={{ color: FLOW_CAPTION_RED_BROWN }}>
          {caption}
        </span>
      )}
    </div>
  )
}

// Shared parallax backdrop spanning "What is Basanite", "The problem" and
// "The reframe".
// The image layer is taller than the group and shifts upward as the group
// scrolls, clipped by overflow-hidden so it slides away behind the hero
// above. The 45% factor and 45% top/bottom buffer (h-[190%]) both scale with
// the container height, so the clamp fits exactly regardless of how tall the
// combined sections are.
function ParallaxGroup({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const parallaxRef = useRef<HTMLDivElement>(null)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReduced(true)
  }, [])

  useEffect(() => {
    if (reduced) return
    const wrap = wrapRef.current
    const layer = parallaxRef.current
    if (!wrap || !layer) return

    let raf = 0
    const update = () => {
      raf = 0
      const rect = wrap.getBoundingClientRect()
      const max = rect.height * 0.45
      const shift = Math.max(-max, Math.min(max, rect.top * 0.45))
      layer.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div ref={wrapRef} className="relative overflow-hidden border-b border-earth-200/80">
      <div
        ref={parallaxRef}
        aria-hidden="true"
        className="absolute inset-x-0 -top-[45%] h-[190%] will-change-transform"
      >
        <Image src="/bg_pic_sections.png" alt="" fill className="object-cover object-center" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-earth-100/80" />
      <div className="relative">{children}</div>
    </div>
  )
}

function WhereBasaniteFits() {
  const ref = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(false)
  const [inView, setInView] = useState(false)
  const [swapped, setSwapped] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true)
      setEntered(true)
      setSwapped(true)
      return
    }
    const el = ref.current
    if (!el) return
    // Keep observing (no disconnect on first hit): the swap loop below
    // pauses whenever the chart scrolls off screen and resumes on return.
    const obs = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting) setEntered(true)
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Loop between today's process and the Basanite version for as long as
  // the chart is on the visitor's screen. Holding the swapped state longer
  // keeps the gold node the dominant impression.
  useEffect(() => {
    if (reduced || !entered || !inView) return
    const t = setTimeout(() => setSwapped(s => !s), swapped ? 4200 : 2600)
    return () => clearTimeout(t)
  }, [reduced, entered, inView, swapped])

  return (
    <section
      aria-label="What Basanite is and where it fits in your hiring process, and who backs and recognises Basanite"
      className="min-h-screen flex items-center py-12 sm:py-16 px-6"
    >
      <div ref={ref} className={`reveal ${entered ? 'visible' : ''} relative max-w-5xl mx-auto text-center`}>
        <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.28em] mb-4">What is Basanite</p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl leading-[1.05]">
          AI interviewer agents to help you make better hiring decisions.
        </h2>
        <div className="mt-5 mb-6 h-px w-14 bg-gold-600 mx-auto" />

        <div className={`flow mt-10 ${entered ? 'flow-in' : ''} ${swapped ? 'flow-swapped' : ''}`}>
          <div className="relative h-6 mb-6 text-xs font-semibold uppercase tracking-[0.18em]">
            <span className={`absolute inset-0 text-basanite-400 transition-opacity duration-500 ${swapped ? 'opacity-0' : 'opacity-100'}`}>
              Today&rsquo;s typical process
            </span>
            <span className={`absolute inset-0 text-gold-700 transition-opacity duration-500 ${swapped ? 'opacity-100' : 'opacity-0'}`}>
              With Basanite
            </span>
          </div>
          <div className="flex flex-col items-center min-[880px]:flex-row min-[880px]:items-start min-[880px]:justify-center">
            <div className="flow-early">
              <div className="flow-old flex flex-col items-center min-[880px]:flex-row min-[880px]:items-start">
                {EARLY_ROUNDS.map((r, i) => (
                  <Fragment key={r.label}>
                    {i > 0 && <FlowArrow delay={r.delay - 80} />}
                    <FlowNode label={r.label} caption={r.caption} dim delay={r.delay} />
                  </Fragment>
                ))}
              </div>
              <div className="flow-new justify-center" aria-hidden={!swapped}>
                <div className="flow-gold border border-gold-500 bg-gold-500 text-basanite-900 font-semibold px-7 py-3.5 text-lg leading-snug whitespace-nowrap shadow-md shadow-gold-600/25">
                  &#9670; Basanite interview
                </div>
              </div>
            </div>
            <FlowArrow delay={520} />
            <FlowNode label="Final rounds" delay={600} />
            <FlowArrow delay={720} />
            <FlowNode label="Offer" delay={800} />
          </div>
        </div>

        <div className="mt-8 text-basanite-600 text-lg leading-relaxed max-w-2xl mx-auto space-y-4 text-left">
          <p>
            <a
              href="#how-it-works"
              className="text-gold-600 hover:text-gold-500 font-medium underline underline-offset-4 decoration-gold-500/40 transition-colors"
            >
              Basanite agent
            </a>{' '}
            interviews your applicants adaptively from their own CV and briefs
            your team with evidence on each one.
          </p>
          {/* Pseudo-link: the co-pilot page doesn't exist yet; styled to match
              the agent link so the pairing reads as two products. */}
          <p>
            <span className="text-gold-600 font-medium underline underline-offset-4 decoration-gold-500/40 cursor-default">
              Basanite co-pilot
            </span>{' '}
            guides your interviewers live, then ranks each candidate with
            evidence attached.
          </p>
          <p>Fewer interview rounds, better hiring accuracy.</p>
        </div>

      </div>
    </section>
  )
}

// ─── The problem · signal vs noise ───────────────────────────────────
// Living waveform: a clean sine (the CV used to be a real signal) degrading
// into pseudo-random noise (what it reads as now). `wavePath(time)` is a pure
// function of time — wavePath(0) renders on the server for hydration-safe
// first paint, then a rAF loop redraws it each frame. The left sine travels
// and its amplitude breathes; the right side reads as extreme noise — each
// vertex constantly retargets a fresh hash sample, eased with smoothstep so
// the frantic motion stays fluid rather than strobing.
function wavePath(time: number) {
  const hash = (v: number) => {
    const s = Math.sin(v) * 43758.5453
    return (s - Math.floor(s)) * 2 - 1
  }
  const pts: string[] = []
  for (let x = 0; x <= 800; x += 4) {
    const t = x / 800
    const ramp = Math.min(1, Math.max(0, (t - 0.25) / 0.55))
    // Left — traveling sine with a slow breathing amplitude.
    const amp = 14 + 3 * Math.sin(time * 0.9)
    const smooth = Math.sin(x / 38 - time * 2.4) * amp
    // Right — mostly-animated noise: vertices sprint between hash samples
    // (~4 retargets/s), with a small static base so the silhouette keeps
    // some identity between frames.
    const base = hash(x * 12.9898)
    const k = Math.floor(time * 4.2)
    const f = time * 4.2 - k
    const e = f * f * (3 - 2 * f)
    const a = hash(x * 7.13 + k * 101.7)
    const b = hash(x * 7.13 + (k + 1) * 101.7)
    const noise = base * 0.2 + (a + (b - a) * e) * 0.8
    const y = 60 + smooth * (1 - ramp) + noise * (2 + 54 * ramp) * ramp
    pts.push(`${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`)
  }
  return pts.join(' ')
}

function LivingWave() {
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const svg = svgRef.current
    const path = pathRef.current
    if (!svg || !path) return

    // Only burn frames while the wave is actually on screen.
    let raf = 0
    let running = false
    const start = performance.now()
    const tick = (now: number) => {
      path.setAttribute('d', wavePath((now - start) / 1000))
      raf = requestAnimationFrame(tick)
    }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true
        raf = requestAnimationFrame(tick)
      } else if (!entry.isIntersecting && running) {
        running = false
        cancelAnimationFrame(raf)
      }
    })
    obs.observe(svg)
    return () => {
      obs.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 120"
      fill="none"
      aria-hidden="true"
      className="w-full h-16 sm:h-20"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="signal-fade" x1="0" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c49a2f" />
          <stop offset="0.45" stopColor="#c49a2f" />
          <stop offset="1" stopColor="#b3a99e" />
        </linearGradient>
      </defs>
      <line x1="0" y1="60" x2="800" y2="60" stroke="#d4cdc0" strokeWidth="1" />
      <path ref={pathRef} d={wavePath(0)} stroke="url(#signal-fade)" strokeWidth="1.5" />
    </svg>
  )
}

// Rust red matching ACTIVE in DimensionsRadar (the spider chart highlight).
const SIGNAL_RED = '#b03f28'

const FAKE_PHRASES = [
  'Résumés wrote by AI to beat your filter.',
  'Project experience that was never lived.',
  'Screens passed with an AI overlay you can’t see.',
]

// Loops through the three ways the old signals get faked as a vertical
// ticker: one phrase at a time slides up through a fixed-height, centered
// viewport. The first phrase is cloned onto the end of the column so the
// wrap-around scrolls forward like every other step, then snaps back to the
// real first item with the transition disabled — the loop reads as endless.
// Reduced-motion users get all three phrases statically instead.
function RotatingFakes() {
  const [active, setActive] = useState(0)
  const [instant, setInstant] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true)
      return
    }
    const id = setInterval(() => setActive(a => a + 1), 2600)
    return () => clearInterval(id)
  }, [])

  // Landed on the clone (index N): once its 700ms slide finishes, jump back
  // to the real first phrase without animating.
  useEffect(() => {
    if (active !== FAKE_PHRASES.length) return
    const t = setTimeout(() => {
      setInstant(true)
      setActive(0)
    }, 720)
    return () => clearTimeout(t)
  }, [active])

  // Re-enable the transition one frame after the instant snap has painted.
  useEffect(() => {
    if (!instant) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setInstant(false))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [instant])

  if (reduced) {
    return (
      <p
        className="mt-4 text-sm sm:text-base font-medium leading-relaxed max-w-2xl"
        style={{ color: SIGNAL_RED }}
      >
        {FAKE_PHRASES.join(' · ')}
      </p>
    )
  }

  const items = [...FAKE_PHRASES, FAKE_PHRASES[0]]

  return (
    <div className="h-14 sm:h-9 mt-4 overflow-hidden" aria-live="polite">
      <div
        className={instant ? '' : 'transition-transform duration-700 ease-in-out'}
        style={{ transform: `translateY(-${(active * 100) / items.length}%)` }}
      >
        {items.map((phrase, i) => (
          <span
            key={`${phrase}-${i}`}
            className="flex h-14 sm:h-9 items-center justify-start text-base sm:text-xl font-medium leading-snug"
            style={{ color: SIGNAL_RED }}
            aria-hidden={i !== active}
          >
            {phrase}
          </span>
        ))}
      </div>
    </div>
  )
}

function SignalNoise() {
  const ref = useReveal()
  return (
    <section className="min-h-screen flex items-center py-10 sm:py-12 px-6">
      <div ref={ref} className="reveal w-full max-w-5xl mx-auto text-left">
        <div className="max-w-3xl">
        <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-3">
          The problem
        </p>
        <h2 className="font-display text-basanite-900 text-2xl sm:text-3xl md:text-4xl mb-4 leading-[1.15]">
          The CV and the interview stopped telling you the truth.
        </h2>
        <p className="text-basanite-600 text-sm sm:text-base leading-relaxed max-w-2xl">
          <span className="block">
            A polished CV used to mean effort. A clean coding screen used to
            mean skill.
          </span>
          <span className="block">Both are cheap to fake now.</span>
        </p>

        <RotatingFakes />

        <div className="max-w-3xl mt-10">
          <LivingWave />
          <div className="flex items-baseline justify-between mt-4 text-[9px] sm:text-[10px] uppercase tracking-[0.18em]">
            <span className="text-basanite-500">
              Once: <span className="text-clay-700 font-bold">a real signal</span>
            </span>
            <span className="text-basanite-500">
              Now: <span className="text-basanite-400 font-bold">noise you can&rsquo;t read</span>
            </span>
          </div>
        </div>

        <p className="text-basanite-900 font-semibold text-base sm:text-lg leading-relaxed mt-10">
          The old signals still look like signals. They just don&rsquo;t track
          the work anymore.
        </p>

        <div className="grid sm:grid-cols-3 gap-5 text-left mt-12 max-w-4xl">
          {BROKEN_STATS.map(stat => (
            <div key={stat.value} className="relative pt-3 border-t-2 border-clay-500/40">
              <div className="font-display text-clay-600 text-xl sm:text-2xl leading-none mb-2">
                {stat.value}
              </div>
              <p className="text-basanite-600 text-[11px] sm:text-xs leading-relaxed mb-2">
                {stat.desc}
              </p>
              <p className="text-basanite-400 text-[9px] font-semibold uppercase tracking-[0.18em]">
                {stat.source}
              </p>
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  )
}

// The numbers behind the problem — rendered inside SignalNoise below the
// waveform.
const BROKEN_STATS = [
  {
    value: '48%',
    desc: 'of technical candidates were caught using AI to cheat on assessments.',
    source: 'Fabric HQ · N=19,368',
  },
  {
    value: '61%',
    desc: 'of those who cheated passed the screen anyway.',
    source: 'Fabric HQ · N=19,368',
  },
  {
    value: '1 in 4',
    desc: 'candidate profiles worldwide will be fake by 2028.',
    source: 'Gartner',
  },
]

// ─── The reframe ─────────────────────────────────────────────────────
// The pivot between "The problem" (the signals broke) and "The dimensions"
// (what we measure instead). The delegate / verify / override triad names the
// skill that replaces "can they code without AI?" — rendered in the site's
// own idiom (gold top-rules and serif step numbers) rather than plain columns.
const REFRAME_CAPABILITIES = [
  {
    step: '01',
    title: 'Delegate',
    desc: 'Knows which work to hand to the agent, and how to brief it well.',
  },
  {
    step: '02',
    title: 'Verify',
    desc: 'Checks what the agent produces before any of it ships.',
  },
  {
    step: '03',
    title: 'Override',
    desc: 'Recognises when the agent is wrong and takes back control.',
  },
]

function Reframe() {
  const ref = useReveal()
  return (
    <section className="relative py-14 sm:py-16 px-6">
      <div ref={ref} className="reveal w-full max-w-5xl mx-auto text-right">
        <div className="w-px h-10 sm:h-14 bg-gradient-to-b from-transparent to-gold-500/60 ml-auto mb-8" />
        <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
          The reframe
        </p>
        <h2 className="font-display text-basanite-900 text-2xl sm:text-3xl md:text-4xl mb-6 leading-[1.15] max-w-3xl ml-auto">
          The same tool that broke hiring is the thing worth hiring for.
        </h2>
        <p className="text-basanite-600 text-base sm:text-lg leading-relaxed max-w-2xl ml-auto mb-12">
          An engineer who can direct an AI agent to ship real work is a genuine
          multiplier, not something to screen out.
        </p>

        <div className="grid gap-8 sm:grid-cols-3 max-w-4xl ml-auto text-right">
          {REFRAME_CAPABILITIES.map(cap => (
            <div key={cap.step} className="pt-4 border-t-2 border-gold-500/40">
              <h3 className="font-display text-basanite-900 text-xl sm:text-2xl mb-2 leading-none">
                {cap.title}
              </h3>
              <p className="text-basanite-600 text-sm leading-relaxed">
                {cap.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl ml-auto mt-14">
          <p className="font-display text-basanite-400 text-lg sm:text-xl leading-snug line-through decoration-clay-500/70 decoration-2">
            Can they work without AI?
          </p>
          <p className="font-display text-basanite-900 text-xl sm:text-2xl leading-snug mt-3">
            What can they genuinely do, and how well do they do it with
            AI in the room?
          </p>
        </div>

        <div className="w-px h-10 sm:h-14 bg-gradient-to-b from-gold-500/60 to-transparent ml-auto mt-10" />
      </div>
    </section>
  )
}

// ─── Section 5 · What we measure ─────────────────────────────────────────
// The eight dimensions and their probing questions live in DimensionsRadar,
// which renders them around an animated spider chart (and carries the
// screen-reader-friendly list).
const DIMENSION_ROLES = [
  'product managers',
  'AI engineers',
  'QA engineers',
  'developers',
  'platform engineers',
  'data scientists',
  'junior engineers',
  'team leads',
]

function TypedRole({ word }: { word: string }) {
  const [text, setText] = useState(word)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(word)
      return
    }
    const id = setInterval(() => {
      setText(cur => {
        if (cur === word) {
          clearInterval(id)
          return cur
        }
        return word.startsWith(cur) ? word.slice(0, cur.length + 1) : cur.slice(0, -1)
      })
    }, 50)
    return () => clearInterval(id)
  }, [word])

  return (
    <span aria-hidden="true" className="text-gold-600">
      {text}
      <span className="inline-block w-[3px] h-[0.85em] ml-0.5 bg-gold-600/70 animate-pulse" />
    </span>
  )
}

function WhatWeMeasure() {
  const ref = useReveal()
  const [role, setRole] = useState('tech people')
  return (
    <section className="py-12 sm:py-16 px-6 bg-earth-50 border-b border-earth-200/80">
      <div ref={ref} className="reveal max-w-6xl mx-auto text-center">
        <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
          The dimensions
        </p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 leading-[1.15]">
          We measure how <span className="sr-only">tech people</span>
          <TypedRole word={role} /> think with AI
        </h2>

        <DimensionsRadar onActiveChange={i => setRole(DIMENSION_ROLES[i])} />

        <div
          className="max-w-[41rem] mx-auto mt-8 sm:mt-10 mb-3 text-left"
        >
          <p className="text-basanite-900 text-lg sm:text-xl font-bold leading-snug mb-1">
            Coding tests assume the candidate works alone. That world is gone.
          </p>
          <p className="text-basanite-700 text-xs sm:text-sm leading-normal mb-2">
            <span className="font-semibold text-basanite-900">
              76% of technical candidates now use AI mid-interview.
            </span>{' '}
            The question that predicts on-the-job performance has shifted from
            &ldquo;can they code without it?&rdquo; to &ldquo;how well do they
            think with it?&rdquo;
          </p>
          <p className="text-basanite-700 text-xs sm:text-sm leading-normal">
            Eight dimensions. One rubric. Defensible scoring.
          </p>
        </div>

        <div className="max-w-[41rem] mx-auto text-left mt-4">
          <a
            href="/methodology"
            className="text-gold-700 hover:text-gold-600 underline underline-offset-4 decoration-gold-500/60 font-medium text-base sm:text-lg"
          >
            Read the methodology &rarr;
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Product demo video ─────────────────────────────────────────────────
function DemoVideo() {
  const ref = useReveal()
  return (
    <section
      id="demo"
      ref={ref}
      className="reveal py-20 sm:py-28 px-6 bg-earth-50"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-gold-600 font-semibold mb-3">
            Watch the demo
          </p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-basanite-900 leading-[1.15]">
            Two minutes inside Basanite.
          </h2>
        </div>
        <div className="relative aspect-video bg-basanite-950 ring-1 ring-basanite-200/40 shadow-[0_30px_80px_-20px_rgba(15,15,14,0.35)] overflow-hidden">
          {/* Native HTML5 video — same-origin, no third-party player chrome.
              `preload="none"` skips byte-zero fetching until the user clicks
              play; the poster carries first-paint. faststart MOOV atom in the
              MP4 means seek-anywhere playback once buffering begins. */}
          <video
            controls
            preload="none"
            poster="/demo-poster.jpg"
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/demo.mp4" type="video/mp4" />
            Your browser doesn&apos;t support embedded video. Download the demo:&nbsp;
            <a href="/demo.mp4">demo.mp4</a>
          </video>
        </div>
      </div>
    </section>
  )
}

// ─── How It Works (animated slider) ──────────────────────────────────────
// The six steps, their mockups, and the slider mechanics live in
// HowItWorksSlider.
function HowItWorks() {
  const ref = useReveal()

  return (
    <section id="how-it-works" className="py-24 sm:py-32 px-6 bg-white">
      <div ref={ref} className="reveal max-w-4xl mx-auto text-center">
        <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-3">The process</p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl mb-10">How Basanite works</h2>

        <HowItWorksSlider />

        <div className="mt-5 pt-8 border-t border-earth-200">
          <p className="text-basanite-600 text-sm mb-3">Want to see what comes out the other end?</p>
          <a
            href="/sample-reports"
            className="inline-flex items-center gap-2 font-display text-lg text-gold-700 hover:text-gold-600 transition-colors"
          >
            See sample reports
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── For Hirers / For Candidates ─────────────────────────────────────────
function ForBoth() {
  const ref = useReveal()
  return (
    <section className="py-24 sm:py-32 px-6 bg-earth-50">
      <div ref={ref} className="reveal max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="card-hover border border-earth-300/60 bg-white p-8 sm:p-10 flex flex-col text-center">
            <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-4">For hiring teams</p>
            <h3 className="font-display text-basanite-900 text-2xl mb-4">Your hiring decision, with better evidence</h3>
            <ul className="space-y-3 text-basanite-600 text-sm leading-relaxed text-left flex-1">
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                <span><span className="font-medium text-basanite-900">Basanite agent</span> runs your round. An adaptive voice interview built from the candidate&rsquo;s own CV, followed by a written briefing for your team.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                <span><span className="font-medium text-basanite-900">Basanite co-pilot</span> sits with your interviewers in your rounds. It suggests what to probe next, then writes up the session for you.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                The tenth candidate gets the same rigour as the first. No drift from interviewer fatigue.
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                Scores are anchored to what the candidate actually said. Every number opens to the quote behind it.
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                Fewer rounds, and your engineers stay on the projects that need them.
              </li>
            </ul>
            <a
              href={REGISTER_INTEREST_URL}
              className="inline-block mt-8 mx-auto px-6 py-3 bg-basanite-900 text-earth-50 text-sm font-medium hover:bg-gold-600 transition-colors"
            >
              Register interest
            </a>
          </div>

          <div className="card-hover border border-earth-300/60 bg-white p-8 sm:p-10 flex flex-col text-center">
            <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-4">For candidates</p>
            <h3 className="font-display text-basanite-900 text-2xl mb-4">Be genuinely seen</h3>
            <ul className="space-y-3 text-basanite-600 text-sm leading-relaxed text-left flex-1">
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                A conversation, not an interrogation. Questions grow organically from your own experience
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                No trick questions, no expected answers. We are looking for how you actually think, not how well you prepared
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                Saying &ldquo;I don&rsquo;t know&rdquo; with genuine awareness is treated differently from a confident but hollow answer
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                You receive a personal feedback report, regardless of outcome
              </li>
            </ul>
            <a href="#how-it-works" className="inline-block mt-8 mx-auto px-6 py-3 border border-basanite-900 text-basanite-900 text-sm font-medium hover:bg-basanite-900 hover:text-earth-50 transition-colors">
              Learn more
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Team ────────────────────────────────────────────────────────────────
type TeamMember = {
  name: string
  role: string
  bullets: string[]
  img: string
  linkedin: string
  x?: string
}
const TEAM: TeamMember[] = [
  {
    name: 'Aditya Shah',
    role: 'Co-founder',
    bullets: [
      'Data Analyst and Technology Modeller at Virgin Media O2',
      'Serial entrepreneur, previously funded startup in edtech',
      'Computer Science, University of Manchester',
    ],
    img: '/team/aditya.png',
    linkedin: 'https://www.linkedin.com/in/adityashah100/',
  },
  // Temporarily hidden — restore this entry to bring Drew back into the team grid.
  // {
  //   name: 'Drew Robertson',
  //   role: 'CTO',
  //   bullets: [
  //     'SWE Intern at The Trade Desk, Rothschild and Co, Cisco',
  //     'ICHack26 1st place, Bloomberg Bpuzzled 1st place',
  //     'Computer Science, University of Manchester',
  //   ],
  //   img: '/team/drew.png',
  //   linkedin: 'https://www.linkedin.com/in/andrewrobertsonamr/',
  //   x: 'https://x.com/NeoDrewX',
  // },
  {
    name: 'Lynn Zhao',
    role: 'Co-founder',
    bullets: [
      'AI Safety Fellowship at BlueDot Impact, OpenAI, Cambridge',
      'UniHack 2025 Digital CleanUp 1st place',
      'BSc Artificial Intelligence, University of Manchester',
    ],
    img: '/team/lynn.png',
    linkedin: 'https://www.linkedin.com/in/lynn-zhao-59a198292/',
  },
]

function Team() {
  const ref = useReveal()
  return (
    <section id="team" className="py-24 sm:py-32 px-6 bg-white">
      <div ref={ref} className="reveal max-w-6xl mx-auto">
        <div className="mb-14 text-center">
          <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-3">The team</p>
          <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl mb-4">Built by people who have felt the problem</h2>
          <p className="text-basanite-600 max-w-xl mx-auto leading-relaxed">
            Engineers and AI researchers from Manchester, building the hiring tool we wish existed.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {TEAM.map(member => (
            <div key={member.name} className="card-hover border border-earth-300/60 bg-white flex flex-col">
              <div className="p-7 flex flex-col flex-1">
                <div className="flex flex-col items-center text-center gap-3 mb-5">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-earth-200 shrink-0">
                    <Image
                      src={member.img}
                      alt={member.name}
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-basanite-900 text-lg leading-tight">{member.name}</h3>
                    <p className="text-gold-600 text-xs font-semibold uppercase tracking-widest mt-0.5">{member.role}</p>
                  </div>
                </div>
                <ul className="space-y-2 flex-1">
                  {member.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-basanite-600">
                      <span className="text-gold-500 shrink-0 mt-px text-xs font-bold">&#9670;</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center justify-center gap-4">
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-basanite-500 hover:text-gold-600 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                  {member.x && (
                    <a
                      href={member.x}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-basanite-500 hover:text-gold-600 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Waitlist CTA (with inline stats recap) ──────────────────────────────
const CTA_STATS = [
  { value: '8', label: 'metacognitive dimensions' },
  { value: '2', label: 'rounds: think + do' },
  { value: '100%', label: 'quote-grounded scores' },
  { value: 'Fewer', label: 'rounds, better accuracy' },
]

function WaitlistCTA() {
  const ref = useReveal()
  return (
    <section id="request-access" className="relative py-24 sm:py-32 px-6 overflow-hidden">
      <div className="absolute inset-0">
        <img src="/bsnt_2.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-basanite-900/95" />
      </div>
      <StoneTexture />
      <div ref={ref} className="reveal relative z-10 max-w-3xl mx-auto">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display text-earth-50 text-3xl sm:text-4xl md:text-5xl mb-6">
            Ready to hire with confidence?
          </h2>
          <p className="text-earth-300 text-lg mb-10 leading-relaxed">
            Register your interest and we&rsquo;ll reach out with early access — whether you
            hire, interview, or are looking for your next role.
          </p>

          <a
            href={REGISTER_INTEREST_URL}
            className="inline-block px-12 py-4 bg-gold-500 hover:bg-gold-400 text-white font-semibold text-base tracking-wide transition-colors duration-200"
          >
            Register interest
          </a>

          <p className="text-xs text-earth-300/70 mt-8">
            Already have access? <a href="/login" className="text-gold-400 hover:text-gold-300 underline">Sign in</a>
            <span className="mx-2 text-earth-300/40">·</span>
            More questions first? <a href="/faq" className="text-gold-400 hover:text-gold-300 underline">See the FAQ</a>.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-10 px-6 bg-basanite-950 border-t border-basanite-800">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <LogoMark size={22} />
            <span className="text-earth-300 text-sm font-display">Basanite</span>
          </div>
          <p className="text-basanite-500 text-xs text-center sm:text-right">
            &copy; {new Date().getFullYear()} Basanite.
          </p>
        </div>
        <div className="border-t border-basanite-800 mt-6 pt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-basanite-500">
          <a href="/about" className="hover:text-earth-200">About</a>
          <span className="text-basanite-700">·</span>
          <a href="/contact" className="hover:text-earth-200">Contact</a>
          <span className="text-basanite-700">·</span>
          <a href="/blog" className="hover:text-earth-200">Blog</a>
          <span className="text-basanite-700">·</span>
          <a href="/faq" className="hover:text-earth-200">FAQ</a>
          <span className="text-basanite-700">·</span>
          <a href="/privacy" className="hover:text-earth-200">Privacy</a>
          <span className="text-basanite-700">·</span>
          <a href="/terms" className="hover:text-earth-200">Terms</a>
          <span className="text-basanite-700">·</span>
          <a href="/legal/subprocessors" className="hover:text-earth-200">Sub-processors</a>
          <span className="text-basanite-700">·</span>
          <a href="/data-rights" className="hover:text-earth-200">Your data rights</a>
        </div>
        <div className="border-t border-basanite-800 mt-4 pt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-basanite-600">
          <span className="text-basanite-500">Compare:</span>
          <a href="/compare/hackerrank-vs-basanite" className="hover:text-earth-200">vs HackerRank</a>
          <span className="text-basanite-700">·</span>
          <a href="/compare/hirevue-vs-basanite" className="hover:text-earth-200">vs HireVue</a>
          <span className="text-basanite-700">·</span>
          <a href="/compare/karat-vs-basanite" className="hover:text-earth-200">vs Karat</a>
          <span className="text-basanite-700">·</span>
          <a href="/compare/codesignal-vs-basanite" className="hover:text-earth-200">vs CodeSignal</a>
          <span className="text-basanite-700">·</span>
          <a href="/alternatives/hackerrank" className="hover:text-earth-200">HackerRank alternatives</a>
          <span className="text-basanite-700">·</span>
          <a href="/alternatives/hirevue" className="hover:text-earth-200">HireVue alternatives</a>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      {/* Catches Supabase auth tokens left in the URL fragment by admin-
          generated magic / invite / recovery links (Supabase strips the
          intended redirect_to back to the bare Site URL, so they land
          here). Persists the session and routes the user onward. */}
      <AuthFragmentHandler />
      <SiteNav />
      <Hero />
      <ParallaxGroup>
        <WhereBasaniteFits />
        <SignalNoise />
        <Reframe />
      </ParallaxGroup>
      <WhatWeMeasure />
      <ImpactSection />
      <HowItWorks />
      <DemoVideo />
      <ForBoth />
      <Team />
      <WaitlistCTA />
      <Footer />
    </>
  )
}
