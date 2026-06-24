/** @type {import('next').NextConfig} */

// Content-Security-Policy is issued per-request from middleware.ts so each
// response can carry its own nonce; the static headers here are the rest of
// the security profile that doesn't need a nonce.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
]

const path = require('path')

const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Power-By header leaks framework identity to the network — strip it.
  poweredByHeader: false,
  // Trailing slashes are normalised off so duplicate-content canonical
  // signals stay consistent across the sitemap, internal links, and what
  // crawlers actually fetch.
  trailingSlash: false,
  images: {
    // Use modern formats first; the optimiser falls back to PNG/JPEG for
    // older clients.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Compression is on by default on Vercel; flag it explicitly for any
  // self-hosted environment so Brotli + gzip both ship.
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Long-cache the static-by-construction sitemap and robots once they
        // are generated. The metadata files re-render on each deploy, so a
        // browser/CDN cache of an hour is safe.
        source: '/(sitemap.xml|robots.txt)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600' }],
      },
      {
        // Versioned next assets are immutable; long cache lifetime.
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}
module.exports = nextConfig
