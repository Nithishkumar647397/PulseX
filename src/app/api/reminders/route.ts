import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch upcoming events with their sent_logs to calculate "Next Reminder"
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*, sent_log(*)')
    .eq('user_id', user.id)
    .eq('completed', false)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })

  // Fetch all sent_logs directly for the reverse-chronological list
  // Supabase inner join to ensure we only get sent_logs for this user's events
  const { data: recentActivity, error: activityError } = await supabase
    .from('sent_log')
    .select('*, event:events!inner(id, user_id, title, category, priority)')
    .eq('event.user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(50)

  if (eventsError || activityError) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  return NextResponse.json({
    upcomingEvents: events || [],
    recentActivity: recentActivity || []
  })
}
