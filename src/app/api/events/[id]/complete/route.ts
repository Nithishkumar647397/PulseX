import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const completed = body.completed !== undefined ? body.completed : true

    // 1. Update the event's completed status
    const { data: event, error: updateError } = await supabase
      .from('events')
      .update({ completed })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) throw updateError

    // 2. Fetch all events for that user on the same date (using the local date bounds of the event)
    const eventDateObj = new Date(event.event_date)
    const startOfDay = new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), eventDateObj.getDate())
    const startOfNextDay = new Date(startOfDay)
    startOfNextDay.setDate(startOfNextDay.getDate() + 1)
    
    // Convert to YYYY-MM-DD for the streak table's date column
    // Since dates in JS can be tricky with UTC, we use the local year/month/day
    const dateKey = `${startOfDay.getFullYear()}-${String(startOfDay.getMonth() + 1).padStart(2, '0')}-${String(startOfDay.getDate()).padStart(2, '0')}`

    const { data: allEvents, error: fetchError } = await supabase
      .from('events')
      .select('priority, completed')
      .eq('user_id', user.id)
      .gte('event_date', startOfDay.toISOString())
      .lt('event_date', startOfNextDay.toISOString())

    if (fetchError) throw fetchError

    // 3. Calculate streak metrics
    const tasks_total = allEvents.length
    const tasks_completed = allEvents.filter(e => e.completed).length
    
    const priority2PlusEvents = allEvents.filter(e => e.priority >= 2)
    let all_completed = false
    
    if (priority2PlusEvents.length > 0) {
      all_completed = priority2PlusEvents.every(e => e.completed)
    } else {
      // If there are only priority 1 items, the streak is maintained if all of them are completed
      // Or maybe if at least one is completed? "priority 1 items are tracked but don't break the streak if missed"
      // If we don't break the streak if missed, then all_completed = true as long as there are ANY events.
      // But let's say they must complete at least 1 task overall if there are only priority 1s.
      all_completed = tasks_completed > 0 || tasks_total === 0
    }

    // 4. Upsert streak record
    const { error: streakError } = await supabase
      .from('streaks')
      .upsert(
        {
          user_id: user.id,
          date: dateKey,
          tasks_total,
          tasks_completed,
          all_completed
        },
        { onConflict: 'user_id,date' }
      )

    if (streakError) throw streakError

    return NextResponse.json({ event, streak_updated: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
