'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  Bell, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Plus, 
  Home, 
  Clock, 
  CalendarDays, 
  User, 
  ArrowRight,
  BookOpen,
  FileText,
  Users,
  CircleDot,
  Trash2,
  Zap
} from 'lucide-react'
import AddEventModal from '@/components/AddEventModal'

// --- Types ---
type Event = {
  id: string
  title: string
  event_date: string
  category: string
  priority: number
  completed: boolean
}

type StreakData = {
  current_streak: number
  today: {
    total: number
    completed: number
    ratio: number
  }
}

type ConflictData = {
  date: string
  count: number
  events: Event[]
}

// --- Helper Functions ---
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const formatDateLine = () => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }
  return new Date().toLocaleDateString('en-US', options)
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'exam': return <BookOpen className="w-3 h-3" />
    case 'assignment': return <FileText className="w-3 h-3" />
    case 'meeting': return <Users className="w-3 h-3" />
    default: return <CircleDot className="w-3 h-3" />
  }
}

const getPriorityClass = (priority: number) => {
  if (priority >= 4) return 'chip-exam'
  if (priority === 3) return 'chip-high'
  if (priority === 2) return 'chip-medium'
  return 'chip-low'
}

const getPriorityLabel = (priority: number) => {
  if (priority >= 4) return 'EXAM'
  if (priority === 3) return 'HIGH'
  if (priority === 2) return 'MEDIUM'
  return 'LOW'
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  // --- State ---
  const [userName, setUserName] = useState<string>('User')
  const [loading, setLoading] = useState(true)
  const [todayEvents, setTodayEvents] = useState<Event[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [conflicts, setConflicts] = useState<ConflictData[]>([])
  const [streak, setStreak] = useState<StreakData | null>(null)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)

  // --- Fetch Data ---
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserName(user?.user_metadata?.full_name?.split(' ')[0] || 'Demo User')

      const [resToday, resUpcoming, resConflicts, resStreak] = await Promise.all([
        fetch('/api/events/today'),
        fetch('/api/events?days=7'), 
        fetch('/api/conflicts'),
        fetch('/api/streak')
      ])

      const todayData = resToday.ok ? await resToday.json() : { events: [] }
      const upcomingData = resUpcoming.ok ? await resUpcoming.json() : { events: [] }
      const conflictsData = resConflicts.ok ? await resConflicts.json() : { conflicts: [] }
      const streakData = resStreak.ok ? await resStreak.json() : null

      setTodayEvents(todayData.events || [])
      setConflicts(conflictsData.conflicts || [])
      setStreak(streakData)

      const todayIds = new Set((todayData.events || []).map((e: Event) => e.id))
      setUpcomingEvents((upcomingData.events || []).filter((e: Event) => !todayIds.has(e.id)))

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // --- Handlers ---
  const handleToggleComplete = async (event: Event) => {
    const updatedStatus = !event.completed
    setTodayEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: updatedStatus } : e))
    
    try {
      await fetch(`/api/events/${event.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: updatedStatus })
      })
      const resStreak = await fetch('/api/streak')
      if (resStreak.ok) {
        setStreak(await resStreak.json())
      }
    } catch (error) {
      setTodayEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: !updatedStatus } : e))
    }
  }

  const handleDelete = async (id: string, isToday: boolean) => {
    if (!confirm('Delete this event?')) return
    if (isToday) setTodayEvents(prev => prev.filter(e => e.id !== id))
    else setUpcomingEvents(prev => prev.filter(e => e.id !== id))

    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' })
    } catch (err) {
      fetchData() // rollback on error
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 animate-pulse pb-24">
        <div className="flex justify-between items-center mb-8">
          <div className="w-48 h-8 bg-surface rounded"></div>
          <div className="w-10 h-10 bg-surface rounded-full"></div>
        </div>
        <div className="w-full h-32 bg-surface rounded-2xl mb-8"></div>
        <div className="space-y-4">
          <div className="w-full h-20 bg-surface rounded-2xl"></div>
          <div className="w-full h-20 bg-surface rounded-2xl"></div>
        </div>
      </div>
    )
  }

  const percentage = streak && streak.today.total > 0 ? (streak.today.completed / streak.today.total) * 100 : 0
  const dashArray = 2 * Math.PI * 36
  const dashOffset = dashArray - (dashArray * percentage) / 100

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-text-primary">
      <main className="p-5 max-w-[480px] mx-auto">
        
        {/* Top Bar */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-lg font-bold tracking-tight">
            {getGreeting()} {userName} ☀️
          </h1>
          <div className="w-10 h-10 bg-surface border border-border text-text-primary rounded-full flex items-center justify-center font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Streak Card */}
        {streak && (
          <div className="card-pulse bg-gradient-to-br from-accent-amber/20 to-accent-amber-2/20 border-accent-amber/30 mb-6 flex justify-between items-center">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🔥</span>
                <span className="text-4xl font-black text-accent-amber">{streak.current_streak}</span>
              </div>
              <span className="text-sm font-semibold text-text-muted mt-1 uppercase tracking-wider">day streak</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" className="stroke-surface" strokeWidth="8" fill="none" />
                  <circle 
                    cx="40" cy="40" r="36" 
                    className="stroke-accent-amber transition-all duration-1000 ease-out" 
                    strokeWidth="8" fill="none" strokeLinecap="round"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">{Math.round(percentage)}%</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-text-muted mt-2">
                {streak.today.completed}/{streak.today.total} tasks done
              </span>
            </div>
          </div>
        )}

        {/* Conflict Banner */}
        {conflicts.length > 0 && (
          <div className="bg-accent-amber text-black rounded-2xl p-4 mb-6 flex items-start gap-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Zap className="w-6 h-6 flex-shrink-0 mt-0.5 fill-black" />
            <div>
              <h4 className="font-black">Schedule Conflict</h4>
              <p className="text-sm font-medium mt-1">
                You have {conflicts[0].count} tasks on {new Date(conflicts[0].date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} — plan ahead
              </p>
            </div>
          </div>
        )}

        {/* Today's Tasks */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              Today <span className="bg-surface border border-border text-text-muted px-2 py-0.5 rounded-full text-xs">{todayEvents.length}</span>
            </h3>
          </div>
          
          <div className="space-y-3">
            {todayEvents.length === 0 ? (
              <div className="card-pulse flex flex-col items-center justify-center text-center py-10 opacity-70">
                <CheckCircle2 className="w-10 h-10 text-success-green mb-3 opacity-50" />
                <p className="font-medium text-text-muted">✅ Nothing today. Enjoy your day!</p>
              </div>
            ) : (
              todayEvents.map((event) => (
                <div key={event.id} className="card-pulse p-4 flex items-center gap-4 transition-all group">
                  <button onClick={() => handleToggleComplete(event)} className="flex-shrink-0 focus:outline-none">
                    {event.completed 
                      ? <CheckCircle2 className="w-6 h-6 text-success-green fill-success-green/20" /> 
                      : <Circle className="w-6 h-6 text-border" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${event.completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar">
                      <span className={getPriorityClass(event.priority)}>
                        {getPriorityLabel(event.priority)}
                      </span>
                      <span className="chip bg-surface text-text-muted border border-border flex items-center gap-1">
                        {getCategoryIcon(event.category)} <span className="capitalize">{event.category}</span>
                      </span>
                      <span className="text-xs text-text-muted font-mono whitespace-nowrap ml-1">
                        {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(event.id, true)} className="p-2 text-text-muted hover:text-danger-red opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Coming Up */}
        <section className="mb-8">
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              Coming Up <span className="bg-surface border border-border text-text-muted px-2 py-0.5 rounded-full text-xs">7 days</span>
            </h3>
          </div>
          
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-text-muted py-2 text-center">No upcoming events this week.</p>
            ) : (
              upcomingEvents.slice(0, 5).map((event) => {
                const daysDiff = Math.ceil((new Date(event.event_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                let timeColor = 'bg-success-green/10 text-success-green border-success-green/30'
                if (daysDiff <= 1) timeColor = 'bg-danger-red/10 text-danger-red border-danger-red/30'
                else if (daysDiff <= 3) timeColor = 'bg-accent-amber/10 text-accent-amber border-accent-amber/30'

                return (
                  <div key={event.id} className="card-pulse p-4 flex items-center gap-4 group">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate text-text-primary`}>
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar">
                        <span className={`chip border ${timeColor}`}>
                          In {daysDiff} day{daysDiff !== 1 && 's'}
                        </span>
                        <span className={getPriorityClass(event.priority)}>
                          {getPriorityLabel(event.priority)}
                        </span>
                        <span className="text-xs text-text-muted font-mono whitespace-nowrap ml-1">
                           {new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(event.id, false)} className="p-2 text-text-muted hover:text-danger-red opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>

      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-accent-amber text-black rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center hover:bg-accent-amber-2 transition-transform active:scale-95 z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bottom Navigation */}
      {/* We will implement the global bottom nav component later, providing a stub for now */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-t border-border px-6 py-3 pb-safe z-30">
        <div className="max-w-[480px] mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-accent-amber">
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          <Link href="/upload" className="flex flex-col items-center gap-1 text-text-muted hover:text-text-primary transition-colors">
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-medium">Add</span>
          </Link>
          <Link href="/streak" className="flex flex-col items-center gap-1 text-text-muted hover:text-text-primary transition-colors">
            <Zap className="w-6 h-6" />
            <span className="text-[10px] font-medium">Streak</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-text-muted hover:text-text-primary transition-colors">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Add Event Modal Overlay */}
      {isModalOpen && (
        <AddEventModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false)
            fetchData()
          }} 
        />
      )}

    </div>
  )
}
