/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development'

// blob: required by AudioWorklet modules (ElevenLabs SDK builds worklets on the fly).
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:" // unsafe-eval required by Next.js dev HMR
  : "script-src 'self' 'unsafe-inline' blob:"               // no eval needed in production builds

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://images.unsplash.com",
      "font-src 'self'",
      "media-src 'self' blob:",
      "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.elevenlabs.io wss://*.elevenlabs.io https://*.livekit.cloud wss://*.livekit.cloud",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig = {
  images: {
    domains: ['images.unsplash.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
module.exports = nextConfig
