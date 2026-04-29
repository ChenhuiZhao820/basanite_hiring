'use client'

import { useEffect } from 'react'

// Sets the browser-tab title to "Basanite - {pageTitle}" on mount and tracks
// changes if the prop updates. Used in client components where exporting
// `metadata` isn't an option; server components should use the metadata API
// (the root layout sets a `Basanite - %s` template that does the same thing).
export function useDocumentTitle(pageTitle: string | undefined): void {
  useEffect(() => {
    if (!pageTitle) return
    document.title = `Basanite - ${pageTitle}`
  }, [pageTitle])
}
