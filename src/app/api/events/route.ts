import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { classifyPriority } from '@/utils/classification'


export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7', 10)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  // Calculate dates
  let start = new Date()
  let end = new Date()
  
  if (startDate && endDate) {
    start = new Date(startDate)
    end = new Date(endDate)
  } else {
    // Legacy support for `days`
    end.setDate(start.getDate() + days)
  }

  const { data, error } = await supabase
    .from('events')
    .select('*, sent_log(*)')
    .eq('user_id', user.id)
    .gte('event_date', start.toISOString())
    .lte('event_date', end.toISOString())
    .order('event_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, event_date, category, priority: manualPriority } = body

    if (!title || !event_date || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Auto-classification
    const classification = classifyPriority(title)
    const finalPriority = manualPriority !== undefined ? parseInt(manualPriority, 10) : classification.priority

    // Insert Event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        title,
        event_date,
        category,
        priority: finalPriority,
        completed: false
      })
      .select()
      .single()

    if (eventError) {
      throw eventError
    }

    // Log Classification
    const { error: logError } = await supabase
      .from('classification_log')
      .insert({
        event_id: event.id,
        matched_keyword: classification.keyword,
        assigned_priority: classification.priority
      })

    if (logError) {
      console.error('Failed to log classification:', logError)
      // Do not block event creation for a log failure
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
