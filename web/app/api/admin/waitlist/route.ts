import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Escape a value for a CSV cell per RFC 4180: wrap in quotes when it
// contains a delimiter/quote/newline, doubling any embedded quotes.
function csvCell(value: string | null): string {
  const s = value ?? ''
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.app_metadata?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('waitlist')
    .select('id, name, email, company, phone, referral_source, persona, status, created_at, approved_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const header = 'name,email,company,phone,referral_source,persona,status,joined_at,approved_at'
    const rows = (data ?? []).map(e =>
      [
        csvCell(e.name),
        csvCell(e.email),
        csvCell(e.company),
        csvCell(e.phone),
        csvCell(e.referral_source),
        csvCell(e.persona),
        csvCell(e.status),
        csvCell(e.created_at),
        csvCell(e.approved_at),
      ].join(','),
    )
    const csv = [header, ...rows].join('\r\n') + '\r\n'
    const stamp = new Date().toISOString().slice(0, 10)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="basanite-waitlist-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  return NextResponse.json({ entries: data })
}
