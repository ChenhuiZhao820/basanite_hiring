import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// Polyfill ResizeObserver for jsdom (used by some Next.js / Headless UI bits).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// Polyfill IntersectionObserver.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof IntersectionObserver
}

// matchMedia polyfill for components that read theme/breakpoint media queries.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// Stub navigator.clipboard so CopyButton doesn't blow up.
if (typeof navigator !== 'undefined' && !navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
  })
}

// Stub MediaRecorder for VoiceCloneRecorder / VoiceInterview tests.
if (typeof globalThis.MediaRecorder === 'undefined') {
  // @ts-expect-error — minimal jsdom stub.
  globalThis.MediaRecorder = class MediaRecorder {
    static isTypeSupported() { return true }
    state = 'inactive'
    ondataavailable: ((e: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    onerror: ((e: unknown) => void) | null = null
    start() { this.state = 'recording' }
    stop() {
      this.state = 'inactive'
      this.onstop?.()
    }
    pause() {}
    resume() {}
    requestData() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return false }
  }
}
