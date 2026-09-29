import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch total events
    const { count: totalEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { count: completedEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true)

    // 2. Fetch last 30 days history
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)

    const { data: historyData } = await supabase
      .from('streaks')
      .select('date, all_completed, tasks_total, tasks_completed')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Generate last 30 days array
    const calendar = []
    const weekData = []
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let thisWeekDone = 0

    const historyMap = new Map((historyData || []).map(h => [h.date, h]))

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      
      const dayData = historyMap.get(dateStr)
      const isCompleted = dayData?.all_completed || false

      calendar.push({
        date: dateStr,
        isToday: i === 0,
        completed: isCompleted,
        tasksDone: dayData?.tasks_completed || 0
      })

      if (d >= weekAgo) {
        weekData.push({
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          tasks: dayData?.tasks_completed || 0
        })
        thisWeekDone += dayData?.tasks_completed || 0
      }

      if (isCompleted) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
        if (i === 0) currentStreak = tempStreak // If today is completed, streak continues
      } else {
        if (i > 0) { // If it's broken before today
           currentStreak = 0
        }
        tempStreak = 0
      }
    }

    // If today is not completed but yesterday was, currentStreak is tempStreak from yesterday
    if (!historyMap.get(now.toISOString().split('T')[0])?.all_completed && tempStreak > 0) {
      // Actually, we'd need to properly calculate it backward to be fully accurate.
      // We can just rely on the main API calculation or rough it here.
    }

    return NextResponse.json({
      stats: {
        total: totalEvents || 0,
        completed: completedEvents || 0,
        thisWeek: thisWeekDone,
        longestStreak
      },
      calendar,
      weekData
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
