import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Return 401 if unauthorized. For local testing, we might want to bypass this.
      if (process.env.NODE_ENV === 'production') {
        return new Response('Unauthorized', { status: 401 })
      }
    }

    const supabase = createServiceRoleClient()
    
    // 1. Fetch incomplete events
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*, sent_log(reminder_stage)')
      .eq('completed', false)
      .gte('event_date', today.toISOString())
      
    if (eventsError) throw eventsError

    // 2. Fetch users to map user_id -> email & name
    // listUsers handles pagination, we'll fetch up to 1000 for now.
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (usersError) throw usersError
    
    const userMap = new Map()
    usersData.users.forEach(u => {
      userMap.set(u.id, { 
        email: u.email, 
        name: u.user_metadata?.full_name?.split(' ')[0] || 'there' 
      })
    })

    const emailsToSend: any[] = []
    const logsToInsert: any[] = []

    // Group events by user and by date for conflict detection
    const eventsByUser: Record<string, Record<string, any[]>> = {}
    const individualReminders: any[] = []

    events.forEach(event => {
      const eventDate = new Date(event.event_date)
      const daysRemaining = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
      
      let targetStage = null
      if (daysRemaining === 7 && event.priority === 4) targetStage = '7d'
      else if (daysRemaining === 3 && event.priority >= 3) targetStage = '3d'
      else if (daysRemaining === 1 && event.priority >= 1) targetStage = '1d'
      else if (daysRemaining === 0 && event.priority >= 1) targetStage = 'morning'
      
      // We process conflict detection for 3 days out separately.
      if (daysRemaining === 3 && event.priority >= 3) {
        if (!eventsByUser[event.user_id]) eventsByUser[event.user_id] = {}
        const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`
        if (!eventsByUser[event.user_id][dateKey]) eventsByUser[event.user_id][dateKey] = []
        eventsByUser[event.user_id][dateKey].push(event)
      }

      if (targetStage) {
        // Check if already sent
        const alreadySent = event.sent_log.some((log: any) => log.reminder_stage === targetStage)
        if (!alreadySent) {
            individualReminders.push({ event, targetStage, daysRemaining })
        }
      }
    })

    // Process Conflicts (3 days out)
    const conflictEventIds = new Set()
    
    Object.keys(eventsByUser).forEach(userId => {
      Object.keys(eventsByUser[userId]).forEach(dateKey => {
        const dayEvents = eventsByUser[userId][dateKey]
        if (dayEvents.length >= 2) {
          // Conflict detected!
          const user = userMap.get(userId)
          if (user && user.email) {
            // Check if we already logged 3d for ANY of these events as a sign we sent the conflict
            const alreadySent = dayEvents.some(e => e.sent_log.some((log: any) => log.reminder_stage === '3d'))
            
            if (!alreadySent) {
              const eventDateStr = new Date(dayEvents[0].event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
              
              emailsToSend.push({
                from: 'PulseX <onboarding@resend.dev>',
                to: user.email,
                subject: `⚠️ Schedule Conflict Alert: ${eventDateStr}`,
                html: `
                  <div style="font-family: 'Inter', sans-serif; max-w-md; margin: 0 auto; color: #0F172A;">
                    <h2 style="color: #F59E0B;">Schedule Conflict Warning</h2>
                    <p>Hi ${user.name},</p>
                    <p>You have <strong>${dayEvents.length} important events</strong> scheduled for ${eventDateStr}.</p>
                    <ul>
                      ${dayEvents.map(e => `<li><strong>${e.title}</strong> (${e.category.toUpperCase()})</li>`).join('')}
                    </ul>
                    <p>Please review your schedule to ensure you are prepared!</p>
                    <p>Best,<br>The PulseX Agent</p>
                  </div>
                `
              })
              
              // Log '3d' for all events in this conflict so they don't get individual reminders
              dayEvents.forEach(e => {
                logsToInsert.push({ event_id: e.id, reminder_stage: '3d' })
                conflictEventIds.add(e.id)
              })
            } else {
                // if conflict already sent, make sure we skip individual 3d for these
                dayEvents.forEach(e => conflictEventIds.add(e.id))
            }
          }
        }
      })
    })

    // Process Individual Reminders
    individualReminders.forEach(({ event, targetStage, daysRemaining }) => {
      if (targetStage === '3d' && conflictEventIds.has(event.id)) {
        // Skip individual 3d reminder if they got a bundled conflict warning
        return
      }
      
      const user = userMap.get(event.user_id)
      if (user && user.email) {
        let urgencyColor = '#0F172A'
        if (targetStage === 'morning' || targetStage === '1d') urgencyColor = '#DC2626'
        else if (targetStage === '3d') urgencyColor = '#F59E0B'
        
        let timeText = ''
        if (targetStage === '7d') timeText = 'in one week'
        else if (targetStage === '3d') timeText = 'in 3 days'
        else if (targetStage === '1d') timeText = 'tomorrow'
        else if (targetStage === 'morning') timeText = 'today'
        
        emailsToSend.push({
          from: 'PulseX <onboarding@resend.dev>',
          to: user.email,
          subject: `Reminder: ${event.title} is ${timeText}!`,
          html: `
            <div style="font-family: 'Inter', sans-serif; max-w-md; margin: 0 auto; color: #0F172A;">
              <h2 style="color: ${urgencyColor};">Upcoming Event: ${event.title}</h2>
              <p>Hi ${user.name},</p>
              <p>This is your automated PulseX reminder that <strong>${event.title}</strong> is happening ${timeText}.</p>
              <p>Category: <strong>${event.category.toUpperCase()}</strong></p>
              <br>
              <p>Keep up your streak by marking it complete in your dashboard!</p>
              <p>Best,<br>The PulseX Agent</p>
            </div>
          `
        })
        
        logsToInsert.push({ event_id: event.id, reminder_stage: targetStage })
      }
    })

    // 3. Send emails
    if (emailsToSend.length > 0) {
      await resend.batch.send(emailsToSend)
      await supabase.from('sent_log').insert(logsToInsert)
    }

    return NextResponse.json({ success: true, sent: emailsToSend.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
