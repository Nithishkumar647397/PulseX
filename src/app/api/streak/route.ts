import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Calculate today's completion ratio directly from events
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

    const { data: todaysEvents, error: eventsError } = await supabase
      .from('events')
      .select('completed')
      .eq('user_id', user.id)
      .gte('event_date', startOfToday.toISOString())
      .lt('event_date', startOfTomorrow.toISOString())

    if (eventsError) throw eventsError

    const totalToday = todaysEvents.length
    const completedToday = todaysEvents.filter(e => e.completed).length
    const completionRatio = totalToday > 0 ? completedToday / totalToday : 0

    // 2. Calculate current streak
    // Fetch all historical streak data for this user, ordered by date descending
    const { data: streakHistory, error: streakError } = await supabase
      .from('streaks')
      .select('date, all_completed')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (streakError) throw streakError

    let currentStreak = 0
    
    if (streakHistory && streakHistory.length > 0) {
      // Find what "today" and "yesterday" are in YYYY-MM-DD
      const todayStr = `${startOfToday.getFullYear()}-${String(startOfToday.getMonth() + 1).padStart(2, '0')}-${String(startOfToday.getDate()).padStart(2, '0')}`
      const yesterdayObj = new Date(startOfToday)
      yesterdayObj.setDate(yesterdayObj.getDate() - 1)
      const yesterdayStr = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth() + 1).padStart(2, '0')}-${String(yesterdayObj.getDate()).padStart(2, '0')}`

      // Create a map for quick lookup
      const streakMap = new Map(streakHistory.map(s => [s.date, s.all_completed]))

      // Check if today is completed
      if (streakMap.get(todayStr) === true) {
        currentStreak++
      }

      // If today is completed or not, we check backwards starting from yesterday
      let checkDateObj = new Date(yesterdayObj)
      let checking = true

      while (checking) {
        const checkStr = `${checkDateObj.getFullYear()}-${String(checkDateObj.getMonth() + 1).padStart(2, '0')}-${String(checkDateObj.getDate()).padStart(2, '0')}`
        
        if (streakMap.get(checkStr) === true) {
          currentStreak++
          checkDateObj.setDate(checkDateObj.getDate() - 1) // Go back one more day
        } else {
          // Missing record or not completed -> streak broken
          checking = false
        }
      }
    }

    return NextResponse.json({
      current_streak: currentStreak,
      today: {
        total: totalToday,
        completed: completedToday,
        ratio: completionRatio
      }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
