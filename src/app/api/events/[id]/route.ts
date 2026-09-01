import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(
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
    const body = await request.json()
    const { title, event_date, category, priority } = body

    const updatePayload: any = {}
    if (title !== undefined) updatePayload.title = title
    if (event_date !== undefined) updatePayload.event_date = event_date
    if (category !== undefined) updatePayload.category = category
    if (priority !== undefined) updatePayload.priority = parseInt(priority, 10)

    const { data, error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure they own it (RLS also catches this)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ event: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
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
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
