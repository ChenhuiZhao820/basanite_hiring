'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="px-4 py-2 bg-basanite-900 text-white text-xs font-medium hover:bg-gold-600 transition-colors"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
