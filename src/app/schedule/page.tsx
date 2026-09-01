'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Share, 
  Plus, 
  Home, 
  CalendarDays, 
  Bell, 
  AlertTriangle, 
  User, 
  CheckCircle2, 
  Circle,
  BookOpen,
  FileText,
  Users,
  CircleDot
} from 'lucide-react'
import AddEventModal from '@/components/AddEventModal'

// --- Types ---
type SentLog = {
  id: string
  reminder_stage: string
  sent_at: string
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

type ConflictData = {
  date: string
  count: number
  events: Event[]
}

// --- Helpers ---
const getCategoryIcon = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'exam': return <BookOpen className="w-3 h-3" />
    case 'assignment': return <FileText className="w-3 h-3" />
    case 'meeting': return <Users className="w-3 h-3" />
    default: return <CircleDot className="w-3 h-3" />
  }
}

const getPriorityColor = (priority: number) => {
  if (priority >= 3) return 'bg-red-100 text-red-700'
  if (priority === 2) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-700'
}

const getPriorityLabel = (priority: number) => {
  if (priority >= 3) return 'HIGH'
  if (priority === 2) return 'MEDIUM'
  return 'LOW'
}

const getNextReminder = (event: Event) => {
  let eventStages: string[] = []
  if (event.priority >= 4) eventStages = ['7d', '3d', '1d', 'morning']
  else if (event.priority >= 3) eventStages = ['3d', '1d', 'morning']
  else if (event.priority === 2) eventStages = ['1d', 'morning']
  else eventStages = ['morning']

  const sentStages = event.sent_log?.map(log => log.reminder_stage) || []
  const nextStage = eventStages.find(s => !sentStages.includes(s))
  
  if (!nextStage) return 'None'
  if (nextStage === 'morning') return 'Morning of task'
  return `${nextStage.replace('d', '-day')} reminder`
}

export default function SchedulePage() {
  const router = useRouter()
  
  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<'Today' | 'Week' | 'Month'>('Today')
  const [filter, setFilter] = useState<string>('All')
  
  const [events, setEvents] = useState<Event[]>([])
  const [conflicts, setConflicts] = useState<ConflictData[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Generate days for the strip (3 days ago to 14 days ahead)
  const daysStrip = Array.from({ length: 18 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 3 + i)
    return d
  })

  // Refs for scrolling to today
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const scrollContainer = scrollRef.current
      const element = todayRef.current
      const scrollLeft = element.offsetLeft - scrollContainer.offsetWidth / 2 + element.offsetWidth / 2
      scrollContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Create start and end of the selected date
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      const end = new Date(start)
      end.setDate(end.getDate() + 1)

      const [resEvents, resConflicts] = await Promise.all([
        fetch(`/api/events?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        fetch('/api/conflicts')
      ])

      const dataEvents = await resEvents.json()
      const dataConflicts = await resConflicts.json()

      setEvents(dataEvents.events || [])
      setConflicts(dataConflicts.conflicts || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const handleToggleComplete = async (event: Event) => {
    const updatedStatus = !event.completed
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: updatedStatus } : e))
    try {
      await fetch(`/api/events/${event.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: updatedStatus })
      })
    } catch (error) {
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: !updatedStatus } : e))
    }
  }

  // Determine conflicts for current events
  const conflictEventIds = new Set(
    conflicts
      .filter(c => new Date(c.date).toDateString() === selectedDate.toDateString())
      .flatMap(c => c.events.map(e => e.id))
  )

  // Filter events
  let filteredEvents = [...events]
  if (filter === 'High priority') filteredEvents = filteredEvents.filter(e => e.priority >= 3)
  if (filter === 'Medium') filteredEvents = filteredEvents.filter(e => e.priority === 2)
  if (filter === 'Low') filteredEvents = filteredEvents.filter(e => e.priority === 1)
  if (filter === 'Conflicts') filteredEvents = filteredEvents.filter(e => conflictEventIds.has(e.id))

  // Group by time
  const groupedEvents: Record<string, Event[]> = {}
  filteredEvents.forEach(e => {
    const timeStr = new Date(e.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (!groupedEvents[timeStr]) groupedEvents[timeStr] = []
    groupedEvents[timeStr].push(e)
  })

  const timeSlots = Object.keys(groupedEvents).sort((a, b) => {
    const timeA = new Date(`1970/01/01 ${a}`)
    const timeB = new Date(`1970/01/01 ${b}`)
    return timeA.getTime() - timeB.getTime()
  })

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString()
  const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString()

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      <main className="max-w-md mx-auto">
        
        {/* Header */}
        <header className="px-6 pt-6 pb-4 bg-white border-b border-gray-100 sticky top-0 z-20">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">My Schedule</h1>
              <p className="text-sm text-gray-500">Everything you have coming up.</p>
            </div>
            <button className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
              <Share className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
            {['Today', 'Week', 'Month'].map(v => (
              <button
                key={v}
                onClick={() => setView(v as any)}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  view === v 
                    ? 'bg-black text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Day Strip */}
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 snap-x"
          >
            {daysStrip.map(d => {
              const today = isToday(d)
              const selected = isSelected(d)
              return (
                <button
                  key={d.toISOString()}
                  ref={today ? todayRef : null}
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center min-w-[60px] p-3 rounded-2xl snap-center transition-all ${
                    selected 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : today 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase mb-1">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="text-lg font-bold">{d.getDate()}</span>
                  {today && !selected && <div className="w-1 h-1 bg-blue-600 rounded-full mt-1"></div>}
                </button>
              )
            })}
          </div>
        </header>

        {/* Filters */}
        <div className="px-6 py-4 flex overflow-x-auto hide-scrollbar gap-2">
          {['All', 'High priority', 'Medium', 'Low', 'Conflicts'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filter === f 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Timeline List */}
        <div className="px-6 py-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
              <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-1">No events scheduled</h3>
              <p className="text-sm text-gray-500">Enjoy your free time or add a new task!</p>
            </div>
          ) : (
            <div className="space-y-6 mt-2 relative">
              {/* Vertical line connecting timeline */}
              <div className="absolute left-[52px] top-4 bottom-4 w-px bg-gray-200 z-0 hidden sm:block"></div>
              
              {timeSlots.map(time => (
                <div key={time} className="flex gap-4 relative z-10">
                  <div className="w-[60px] flex-shrink-0 pt-4">
                    <span className="text-[11px] font-bold text-gray-500">{time}</span>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    {groupedEvents[time].map(event => {
                      const isHighPriority = event.priority >= 3
                      return (
                        <div 
                          key={event.id}
                          className={`bg-white rounded-2xl p-4 flex gap-3 shadow-sm transition-all ${
                            isHighPriority && !event.completed ? 'border-2 border-blue-500' : 'border border-gray-100'
                          } ${event.completed ? 'opacity-60' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {getCategoryIcon(event.category)}
                                {event.category}
                              </span>
                              {event.priority > 1 && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider ${getPriorityColor(event.priority)}`}>
                                  {getPriorityLabel(event.priority)}
                                </span>
                              )}
                              {conflictEventIds.has(event.id) && (
                                <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> CONFLICT
                                </span>
                              )}
                            </div>
                            
                            <h4 className={`font-bold text-base leading-tight mb-1 ${event.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {event.title}
                            </h4>
                            
                            <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1.5">
                              <Bell className="w-3.5 h-3.5" />
                              Next reminder: {getNextReminder(event)}
                            </p>
                          </div>

                          <button 
                            onClick={() => handleToggleComplete(event)}
                            className="flex-shrink-0 self-start mt-1 focus:outline-none hover:scale-110 transition-transform"
                          >
                            {event.completed 
                              ? <CheckCircle2 className="w-7 h-7 text-blue-500" /> 
                              : <Circle className="w-7 h-7 text-gray-200 hover:text-gray-300" />
                            }
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-transform active:scale-95 z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 pb-safe z-30">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors">
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/schedule" className="flex flex-col items-center gap-1 text-blue-600 transition-colors">
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-medium">Schedule</span>
          </Link>
          <Link href="/reminders" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors">
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

      {isModalOpen && (
        <AddEventModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false)
            fetchData() // Refresh list after adding
          }} 
        />
      )}

      {/* Global styles for hiding scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  )
}
