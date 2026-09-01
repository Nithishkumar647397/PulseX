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
  X
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
      
      // Attempt to get name from raw_user_meta_data or profiles
      setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'User')

      const [resToday, resUpcoming, resConflicts, resStreak] = await Promise.all([
        fetch('/api/events/today'),
        fetch('/api/events?days=14'), // get next 14 days
        fetch('/api/conflicts'),
        fetch('/api/streak')
      ])

      const todayData = await resToday.json()
      const upcomingData = await resUpcoming.json()
      const conflictsData = await resConflicts.json()
      const streakData = await resStreak.json()

      setTodayEvents(todayData.events || [])
      setConflicts(conflictsData.conflicts || [])
      setStreak(streakData)

      // Filter upcoming to exclude today's events if they appear
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
    // Optimistic update
    const updatedStatus = !event.completed
    setTodayEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: updatedStatus } : e))
    
    try {
      await fetch(`/api/events/${event.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: updatedStatus })
      })
      // Refresh streak data to get accurate backend calculation
      const resStreak = await fetch('/api/streak')
      const streakData = await resStreak.json()
      setStreak(streakData)
    } catch (error) {
      // Revert on error
      setTodayEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: !updatedStatus } : e))
    }
  }

  // --- Derived State ---
  const highestPriorityUpcoming = upcomingEvents.length > 0 
    ? upcomingEvents.filter(e => !e.completed).sort((a, b) => b.priority - a.priority || new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0]
    : null


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 animate-pulse pb-24">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="w-32 h-6 bg-gray-200 rounded"></div>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        </div>
        <div className="w-48 h-4 bg-gray-200 rounded mb-6"></div>
        <div className="w-full h-32 bg-gray-200 rounded-2xl mb-8"></div>
        <div className="w-32 h-6 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-4">
          <div className="w-full h-20 bg-gray-200 rounded-xl"></div>
          <div className="w-full h-20 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      
      <main className="p-6 max-w-md mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{getGreeting()}, {userName}</h1>
            </div>
          </div>
          <button className="p-2 bg-white rounded-full shadow-sm relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </header>

        {/* Date Line */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{formatDateLine()}</h2>
          <p className="text-sm text-gray-600 mt-1">Here's what needs your attention today.</p>
        </div>

        {/* Progress Card */}
        {streak && (
          <div className="bg-slate-900 text-white rounded-2xl p-5 mb-8 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-100">Today's Progress</h3>
              <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full font-medium">
                {streak.today.completed} / {streak.today.total} Tasks completed
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 mb-4">
              <div 
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${streak.today.total > 0 ? (streak.today.completed / streak.today.total) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
              <span>🔥</span>
              <span>{streak.current_streak} day streak - Keep it going!</span>
            </div>
          </div>
        )}

        {/* Conflict Banner */}
        {conflicts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-yellow-800">Schedule Conflict</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {conflicts[0].count} important events on {new Date(conflicts[0].date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            <Link href="/conflicts" className="text-sm font-bold text-yellow-800 hover:text-yellow-900 flex items-center gap-1 self-end">
              Review Conflict <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Today's Tasks */}
        <section className="mb-10">
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-lg font-bold">Today's Tasks</h3>
            <Link href="/tasks" className="text-sm text-blue-600 font-medium hover:underline">
              View all →
            </Link>
          </div>
          
          <div className="space-y-3">
            {todayEvents.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-500 shadow-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Nothing due today — enjoy the break!</p>
              </div>
            ) : (
              todayEvents.map((event) => (
                <div key={event.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3 shadow-sm transition-all hover:shadow-md">
                  <button 
                    onClick={() => handleToggleComplete(event)}
                    className="mt-1 flex-shrink-0 focus:outline-none"
                  >
                    {event.completed 
                      ? <CheckCircle2 className="w-6 h-6 text-blue-500" /> 
                      : <Circle className="w-6 h-6 text-gray-300" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${event.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {event.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full uppercase">
                        {getCategoryIcon(event.category)}
                        {event.category}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  {event.priority > 1 && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 ${getPriorityColor(event.priority)}`}>
                      {getPriorityLabel(event.priority)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Next Reminder Card */}
        {highestPriorityUpcoming && (
          <section className="mb-10">
            <h3 className="text-lg font-bold mb-4">Next Reminder</h3>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${getPriorityColor(highestPriorityUpcoming.priority)}`}>
                  {getPriorityLabel(highestPriorityUpcoming.priority)}
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  {new Date(highestPriorityUpcoming.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <h4 className="font-bold text-lg mb-1 truncate">{highestPriorityUpcoming.title}</h4>
              <p className="text-sm text-gray-500 mb-5">PulseX will remind you automatically.</p>
              <Link 
                href={`/reminder-plan/${highestPriorityUpcoming.id}`}
                className="block w-full bg-black text-white text-center py-3 rounded-xl font-medium hover:bg-gray-900 transition-colors"
              >
                View Reminder Plan
              </Link>
            </div>
          </section>
        )}

        {/* Coming Up */}
        <section className="mb-10">
          <h3 className="text-lg font-bold mb-4">Coming Up</h3>
          <div className="space-y-4 pl-2 border-l-2 border-gray-100">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No upcoming events.</p>
            ) : (
              upcomingEvents.slice(0, 5).map((event) => {
                const isHighPriority = event.priority >= 3
                const daysDiff = Math.ceil((new Date(event.event_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                
                return (
                  <div key={event.id} className="relative pl-6">
                    {/* Timeline dot */}
                    <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-white border-2 
                      ${event.completed ? 'border-gray-300 bg-gray-300' : (isHighPriority ? 'border-red-500' : 'border-blue-500')}
                    `}></div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-semibold ${event.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
                        In {daysDiff} days
                      </span>
                    </div>
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
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-transform active:scale-95 z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 pb-safe z-30">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-blue-600">
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/schedule" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900">
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-medium">Schedule</span>
          </Link>
          <Link href="/reminders" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900">
            <Bell className="w-6 h-6" />
            <span className="text-[10px] font-medium">Reminders</span>
          </Link>
          <Link href="/conflicts" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900">
            <AlertTriangle className="w-6 h-6" />
            <span className="text-[10px] font-medium">Conflicts</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900">
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
