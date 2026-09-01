'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Home, 
  CalendarDays, 
  Bell, 
  AlertTriangle, 
  User, 
  CheckCircle2, 
  Clock,
  Check,
  Circle
} from 'lucide-react'

// --- Types ---
type SentLog = {
  id: string
  event_id: string
  reminder_stage: string
  sent_at: string
  event?: any
}

type Event = {
  id: string
  title: string
  event_date: string
  category: string
  priority: number
  completed: boolean
  sent_log?: SentLog[]
}

// --- Helpers ---
const getPriorityLabel = (priority: number) => {
  if (priority >= 3) return 'HIGH'
  if (priority === 2) return 'MEDIUM'
  return 'LOW'
}

const getPriorityColor = (priority: number) => {
  if (priority >= 3) return 'bg-red-100 text-red-700'
  if (priority === 2) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-700'
}

const getStageDate = (eventDateStr: string, stage: string) => {
  const d = new Date(eventDateStr)
  d.setHours(8, 0, 0, 0) // Assume 8 AM
  if (stage === '7d') d.setDate(d.getDate() - 7)
  if (stage === '3d') d.setDate(d.getDate() - 3)
  if (stage === '1d') d.setDate(d.getDate() - 1)
  return d
}

const getStageLabel = (stage: string) => {
  if (stage === '7d') return '7 days before'
  if (stage === '3d') return '3 days before'
  if (stage === '1d') return '1 day before'
  if (stage === 'morning') return 'Morning of task'
  return stage
}

const formatStageDisplayTime = (d: Date) => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const isToday = d.toDateString() === today.toDateString()
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  
  if (isToday) return `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (isTomorrow) return `Tomorrow · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

export default function RemindersPage() {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [recentActivity, setRecentActivity] = useState<SentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/reminders')
        const data = await res.json()
        setUpcomingEvents(data.upcomingEvents || [])
        setRecentActivity(data.recentActivity || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Find the event with the next upcoming reminder
  let nextEventInfo = null
  let minDiff = Infinity

  for (const event of upcomingEvents) {
    let eventStages: string[] = []
    if (event.priority >= 4) eventStages = ['7d', '3d', '1d', 'morning']
    else if (event.priority >= 3) eventStages = ['3d', '1d', 'morning']
    else if (event.priority === 2) eventStages = ['1d', 'morning']
    else eventStages = ['morning']

    const sentStages = event.sent_log?.map(log => log.reminder_stage) || []
    
    // Check stages in chronological order
    for (const stage of eventStages) {
      if (!sentStages.includes(stage)) {
        const stageDate = getStageDate(event.event_date, stage)
        const diff = stageDate.getTime() - Date.now()
        // If it's in the future (or even slightly past but not sent yet), consider it next
        // Since the backend handles actual sending, anything not in sent_log is pending.
        if (diff < minDiff) {
          minDiff = diff
          nextEventInfo = {
            event,
            stage,
            stageDate,
            allStages: eventStages,
            sentStages
          }
        }
        break // Only care about the FIRST unsent stage for this event
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex justify-center pt-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      <main className="max-w-md mx-auto p-6">
        
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Reminders</h1>
          <p className="text-sm text-gray-500">PulseX is keeping track for you.</p>
        </header>

        {/* Global Empty State */}
        {recentActivity.length === 0 && !nextEventInfo ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-500 shadow-sm mt-8">
            <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <h3 className="font-bold text-gray-900 mb-1">No reminders yet</h3>
            <p className="text-sm">They'll start showing up as your events approach.</p>
          </div>
        ) : (
          <>
            {/* Next Reminder Card */}
            {nextEventInfo ? (
              <section className="mb-10">
                <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Next Reminder</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${getPriorityColor(nextEventInfo.event.priority)}`}>
                      {getPriorityLabel(nextEventInfo.event.priority)}
                    </span>
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-900 mb-3">{nextEventInfo.event.title}</h2>
                  
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 mb-6 bg-blue-50 px-3 py-2 rounded-xl inline-flex">
                    <Clock className="w-4 h-4" />
                    {formatStageDisplayTime(nextEventInfo.stageDate)}
                  </div>

                  {/* Timeline Logic Sub-card */}
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider">Timeline Logic</h3>
                    
                    <div className="space-y-4 relative">
                      {/* Vertical line */}
                      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                      
                      {nextEventInfo.allStages.map((stage: string, idx: number) => {
                        const isSent = nextEventInfo?.sentStages.includes(stage)
                        const isNext = stage === nextEventInfo?.stage
                        
                        return (
                          <div key={stage} className="flex gap-4 relative z-10 items-start">
                            {isSent ? (
                              <div className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-3 h-3" />
                              </div>
                            ) : isNext ? (
                              <div className="w-5 h-5 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.2)] flex-shrink-0 mt-0.5"></div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex-shrink-0 mt-0.5"></div>
                            )}
                            
                            <div className="flex-1">
                              {isSent ? (
                                <p className="text-sm font-medium text-gray-400 line-through">{getStageLabel(stage)}</p>
                              ) : isNext ? (
                                <div>
                                  <p className="text-sm font-bold text-blue-600">{getStageLabel(stage)}</p>
                                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mt-0.5">Next reminder</p>
                                </div>
                              ) : (
                                <p className="text-sm font-medium text-gray-500">{getStageLabel(stage)}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="mb-10">
                <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <h3 className="font-bold text-gray-900 mb-1">You're all caught up!</h3>
                  <p className="text-sm text-gray-500">No upcoming reminders pending.</p>
                </div>
              </section>
            )}

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Recent Activity</h3>
                <div className="space-y-3">
                  {recentActivity.map((log) => {
                    const isConflict = log.reminder_stage === 'conflict_warning'
                    
                    return (
                      <div key={log.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isConflict ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'}`}>
                          {isConflict ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {isConflict 
                              ? 'Schedule conflict warning sent' 
                              : `${log.event?.category ? log.event.category.charAt(0).toUpperCase() + log.event.category.slice(1) : 'Task'} reminder sent`
                            }
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(log.sent_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 pb-safe z-30">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors">
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/schedule" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors">
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-medium">Schedule</span>
          </Link>
          <Link href="/reminders" className="flex flex-col items-center gap-1 text-blue-600 transition-colors">
            <Bell className="w-6 h-6" />
            <span className="text-[10px] font-medium">Reminders</span>
          </Link>
          <Link href="/conflicts" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors">
            <AlertTriangle className="w-6 h-6" />
            <span className="text-[10px] font-medium">Conflicts</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
