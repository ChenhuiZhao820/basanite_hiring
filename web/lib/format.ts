/**
 * Turn a snake_case dimension or capability key into a human label:
 *   "technical_depth" → "Technical Depth"
 *   "requires_expert_verification" → "Requires Expert Verification"
 * Keeps capitalisation inside words that are already mixed-case.
 */
export function formatDimensionKey(key: string): string {
  if (!key) return ''
  return key
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
