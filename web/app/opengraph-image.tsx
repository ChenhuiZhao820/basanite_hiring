import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Basanite — Know Your Candidates Better'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1a1a18 0%, #2b1f12 50%, #3a2a1a 100%)',
          padding: '80px',
          position: 'relative',
          fontFamily: 'serif',
        }}
      >
        {/* Top: brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <svg width="44" height="60" viewBox="0 0 40 54" fill="none">
            <path d="M20 0 L0 18 L20 18 Z" fill="#e8c555" />
            <path d="M20 0 L40 18 L20 18 Z" fill="#d4a843" />
            <path d="M0 18 L20 18 L20 54 Z" fill="#c49a2f" />
            <path d="M40 18 L20 18 L20 54 Z" fill="#a87f24" />
          </svg>
          <div style={{ color: '#e8c555', fontSize: 38, letterSpacing: -1 }}>Basanite</div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Main headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#f3e9d7',
              fontSize: 84,
              lineHeight: 1.05,
              letterSpacing: -2,
              marginBottom: 24,
            }}
          >
            Hire with confidence.
          </div>
          <div
            style={{
              color: '#e8c555',
              fontSize: 84,
              lineHeight: 1.05,
              letterSpacing: -2,
              marginBottom: 40,
            }}
          >
            Know your candidates better.
          </div>
          <div
            style={{
              color: '#c4b5a0',
              fontSize: 28,
              lineHeight: 1.4,
              maxWidth: 900,
            }}
          >
            AI-augmented interviews that improve hiring insight, accuracy, and confidence.
          </div>
        </div>

        {/* Bottom: URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            right: 80,
            color: '#a87f24',
            fontSize: 22,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          basanite.co.uk
        </div>
      </div>
    ),
    { ...size },
  )
}
