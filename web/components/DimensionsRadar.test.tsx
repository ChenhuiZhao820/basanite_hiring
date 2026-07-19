import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { DIMENSIONS, DimensionsRadar, profileFor } from './DimensionsRadar'

const ACTIVE_RED = 'rgb(176, 63, 40)'
const TICK_MS = 2600

// The component gates its cycle on IntersectionObserver; jsdom has none, so
// each test installs a stub whose callback we can fire on demand.
function installIO({ autoIntersect = true }: { autoIntersect?: boolean } = {}) {
  const instances: { cb: IntersectionObserverCallback }[] = []
  class IO {
    cb: IntersectionObserverCallback
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb
      instances.push({ cb })
    }
    observe() {
      if (autoIntersect) {
        act(() => {
          this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never)
        })
      }
    }
    disconnect() {}
    unobserve() {}
  }
  vi.stubGlobal('IntersectionObserver', IO as unknown as typeof IntersectionObserver)
  return instances
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduce && q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }))
}

// The wide layout renders each label as an absolutely-positioned block whose
// first child is the dimension name and last child is the question.
function wideLabels(container: HTMLElement) {
  const wide = container.querySelector('.lg\\:block')
  if (!wide) throw new Error('wide layout not rendered')
  return Array.from(wide.querySelectorAll('div.absolute')) as HTMLElement[]
}

const activeIndex = (labels: HTMLElement[]) =>
  labels.findIndex(l => (l.firstElementChild as HTMLElement).style.color === ACTIVE_RED)

// Advances the clock until the highlight actually moves, so the assertions do
// not depend on the first interval landing on an exact fake-timer boundary.
function advanceToNextShape(labels: HTMLElement[]) {
  const from = activeIndex(labels)
  for (let i = 0; i < 10; i++) {
    act(() => { vi.advanceTimersByTime(TICK_MS) })
    if (activeIndex(labels) !== from) return activeIndex(labels)
  }
  throw new Error(`highlight never advanced from ${from}`)
}

beforeEach(() => {
  vi.useFakeTimers()
  setReducedMotion(false)
  // vitest's fake timers do not patch performance.now, which is what the
  // tween clocks against — without this the polygon never progresses.
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now())
  // rAF drives the polygon tween; run it as a timer so fake timers advance it.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number
  )
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('DimensionsRadar', () => {
  it('renders every dimension name and question', () => {
    installIO()
    const { container } = render(<DimensionsRadar />)
    // Both the wide and narrow layouts render the set, hence getAllByText.
    for (const d of DIMENSIONS) {
      expect(screen.getAllByText(d.name).length).toBeGreaterThan(0)
      expect(screen.getAllByText(d.question).length).toBeGreaterThan(0)
    }
    expect(wideLabels(container)).toHaveLength(DIMENSIONS.length)
  })

  it('highlights exactly one dimension, starting at the first', () => {
    installIO()
    const { container } = render(<DimensionsRadar />)
    const labels = wideLabels(container)
    const red = labels.filter(l => (l.firstElementChild as HTMLElement).style.color === ACTIVE_RED)
    expect(red).toHaveLength(1)
    expect(activeIndex(labels)).toBe(0)
  })

  it('tints the name and its question together', () => {
    installIO()
    const { container } = render(<DimensionsRadar />)
    const labels = wideLabels(container)
    const i = advanceToNextShape(labels)

    expect(i).toBe(1)
    expect((labels[i].lastElementChild as HTMLElement).style.color).toBe(ACTIVE_RED)
    // Neighbours stay in the default colours.
    expect((labels[0].firstElementChild as HTMLElement).style.color).not.toBe(ACTIVE_RED)
    expect((labels[0].lastElementChild as HTMLElement).style.color).not.toBe(ACTIVE_RED)
  })

  it('cycles through all eight shapes and wraps around', () => {
    installIO()
    const { container } = render(<DimensionsRadar />)
    const labels = wideLabels(container)

    const seen: number[] = [activeIndex(labels)]
    for (let step = 0; step < DIMENSIONS.length; step++) {
      seen.push(advanceToNextShape(labels))
    }
    // 0..7 then back to 0
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 0])
  })

  it('gives every shape a single clear peak on its own axis', () => {
    for (let k = 0; k < DIMENSIONS.length; k++) {
      const scores = profileFor(k)
      expect(scores).toHaveLength(DIMENSIONS.length)

      const peak = scores.indexOf(Math.max(...scores))
      expect(peak).toBe(k)

      // The peak must be unambiguous, not a near-tie with a neighbour.
      const others = scores.filter((_, i) => i !== k)
      expect(scores[k]).toBeGreaterThan(Math.max(...others) + 0.2)
      expect(Math.min(...others)).toBeGreaterThan(0) // every axis stays on the chart
      expect(scores[k]).toBeLessThanOrEqual(1)
    }
  })

  it('renders the polygon at the peaked shape for the active dimension', () => {
    installIO()
    const { container } = render(<DimensionsRadar />)
    const poly = container.querySelector('polygon.data-polygon')!
    const pts = poly.getAttribute('points')!.split(' ').map(p => p.split(',').map(Number))

    // Shape 0 is active on first paint: axis 0 (straight up) sits furthest
    // from the centre, the rest fall well inside it.
    const dist = pts.map(([x, y]) => Math.hypot(x - 150, y - 150))
    expect(dist.indexOf(Math.max(...dist))).toBe(0)
  })

  it('pauses while off screen and resumes when scrolled back', () => {
    const instances = installIO({ autoIntersect: false })
    const { container } = render(<DimensionsRadar />)
    const labels = wideLabels(container)
    const fire = (isIntersecting: boolean) =>
      act(() => {
        instances[0].cb([{ isIntersecting } as IntersectionObserverEntry], null as never)
      })

    fire(false)
    act(() => { vi.advanceTimersByTime(TICK_MS * 3) })
    expect(activeIndex(labels)).toBe(0)

    fire(true)
    expect(advanceToNextShape(labels)).toBe(1)
  })

  it('holds a single static shape under prefers-reduced-motion', () => {
    setReducedMotion(true)
    installIO()
    const { container } = render(<DimensionsRadar />)
    const labels = wideLabels(container)
    const before = container.querySelector('polygon.data-polygon')!.getAttribute('points')

    act(() => { vi.advanceTimersByTime(TICK_MS * 4) })

    expect(activeIndex(labels)).toBe(0)
    expect(container.querySelector('polygon.data-polygon')!.getAttribute('points')).toBe(before)
  })
})
