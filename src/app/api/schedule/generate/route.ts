import { NextResponse } from 'next/server'
import { AutoScheduler } from '@/lib/autoScheduler'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const week = body?.week ? new Date(body.week) : new Date()
    // overrides non usati per ora
    const scheduler = new AutoScheduler()
    const result = await scheduler.generateWeeklySchedule(week)
    return NextResponse.json(result, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Errore generazione' }, { status: 500 })
  }
}


