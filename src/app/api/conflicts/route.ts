import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all upcoming events with priority >= 3
  const today = new Date()
  
  const { data: highPriorityEvents, error } = await supabase
    .from('events')
    .select('id, title, event_date, category, priority')
    .eq('user_id', user.id)
    .gte('priority', 3)
    .gte('event_date', today.toISOString())
    .order('event_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by date
  const eventsByDate: Record<string, any[]> = {}

  highPriorityEvents.forEach(event => {
    // Extract local date string YYYY-MM-DD
    const d = new Date(event.event_date)
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = []
    }
    eventsByDate[dateKey].push(event)
  })

  // Filter for dates with 2 or more high priority events
  const conflicts = Object.entries(eventsByDate)
    .filter(([_, events]) => events.length >= 2)
    .map(([date, events]) => ({
      date,
      count: events.length,
      events
    }))

  return NextResponse.json({ conflicts })
}
