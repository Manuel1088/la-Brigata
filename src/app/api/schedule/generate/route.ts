import { NextResponse } from 'next/server'
import { AutoScheduler } from '@/lib/autoScheduler'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const week = body?.week ? new Date(body.week) : new Date()
    // overrides non usati per ora
    const scheduler = new AutoScheduler()
    const schedule = await scheduler.generateWeeklySchedule(week)
    const conflicts = scheduler.getConflicts()
    const metrics = scheduler.getMetrics()
    return NextResponse.json({ schedule, conflicts, metrics }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Errore generazione' }, { status: 500 })
  }
}


