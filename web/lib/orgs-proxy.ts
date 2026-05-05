// Helper used by every /api/orgs/* proxy. Resolves the signed-in user
// and forwards the request to FastAPI with the pipeline secret.

import { createClient } from '@/lib/supabase/server'

export const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
export const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function pipelineFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${PIPELINE_SECRET}`)
  return fetch(`${PIPELINE_URL}${path}`, { ...init, headers, cache: 'no-store' })
}
