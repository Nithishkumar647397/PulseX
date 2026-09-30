'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  Trash2, 
  AlertTriangle, 
  Plus, 
  X,
  Check
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
  if (hour < 12) return 'Good morning 👋'
  if (hour < 18) return 'Good afternoon 👋'
  return 'Good evening 👋'
}

const getDaysRemainingLabel = (eventDateStr: string) => {
  const eventDate = new Date(eventDateStr)
  eventDate.setHours(0, 0, 0, 0)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const diffTime = eventDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return { text: 'TODAY', className: 'bg-red-500 text-white' }
  if (diffDays === 1) return { text: 'TOMORROW', className: 'bg-orange-100 text-orange-600' }
  if (diffDays === 2 || diffDays === 3) return { text: `in ${diffDays} days`, className: 'bg-amber-100 text-amber-700' }
  if (diffDays < 0) return { text: 'OVERDUE', className: 'bg-red-500 text-white' }
  return { text: `in ${diffDays} days`, className: 'bg-slate-100 text-slate-500' }
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getPriorityStyle = (category: string, priority: number) => {
  if (category.toLowerCase() === 'exam') return 'bg-red-500'
  if (priority >= 3) return 'bg-orange-400'
  if (priority === 2) return 'bg-blue-400'
  return 'bg-slate-300'
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  
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
        fetch('/api/events?days=14'), // get next 14 days
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

      // Filter upcoming to exclude today's events if they appear
      const todayIds = new Set((todayData.events || []).map((e: Event) => e.id))
      setUpcomingEvents((upcomingData.events || []).filter((e: Event) => !todayIds.has(e.id)))

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Handle pull to refresh
  const [startY, setStartY] = useState(0)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) setStartY(e.touches[0].clientY)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0) return
    const currentY = e.touches[0].clientY
    if (currentY - startY > 100) {
      setIsRefreshing(true)
      fetchData()
      setStartY(0)
    }
  }
  const handleTouchEnd = () => setStartY(0)

  useEffect(() => {
    // eslint-disable-next-line
    fetchData()
  }, [])

  // --- Handlers ---
  const handleToggleComplete = async (event: Event) => {
    const updatedStatus = !event.completed
    setTodayEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: updatedStatus } : e))
    setUpcomingEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: updatedStatus } : e))
    
    if (streak && updatedStatus) {
       setStreak({
         ...streak,
         today: {
           ...streak.today,
           completed: Math.min(streak.today.total, streak.today.completed + 1)
         }
       })
    } else if (streak && !updatedStatus) {
       setStreak({
         ...streak,
         today: {
           ...streak.today,
           completed: Math.max(0, streak.today.completed - 1)
         }
       })
    }

    try {
      await fetch(`/api/events/${event.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: updatedStatus })
      })
      const resStreak = await fetch('/api/streak')
      if (resStreak.ok) {
        const streakData = await resStreak.json()
        setStreak(streakData)
      }
    } catch (error) {
      console.error(error)
      setTodayEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: !updatedStatus } : e))
      setUpcomingEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: !updatedStatus } : e))
    }
  }

  const handleDelete = async (id: string, isToday: boolean) => {
    if (isToday) {
      setTodayEvents(prev => prev.filter(e => e.id !== id))
    } else {
      setUpcomingEvents(prev => prev.filter(e => e.id !== id))
    }
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const dismissConflict = (date: string) => {
    setConflicts(prev => prev.filter(c => c.date !== date))
  }

  // --- Group Upcoming ---
  const upcomingGrouped = upcomingEvents.reduce((acc, event) => {
    const dateStr = new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    const dayLabel = getDaysRemainingLabel(event.event_date).text
    
    let headerLabel = `${dateStr}`
    if (dayLabel === 'TOMORROW') headerLabel = `TOMORROW`
    else if (dayLabel === 'in 2 days' || dayLabel === 'in 3 days') headerLabel = dayLabel
    
    headerLabel = headerLabel.toUpperCase()

    if (!acc[headerLabel]) acc[headerLabel] = []
    acc[headerLabel].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-5 animate-pulse pb-24">
        <div className="flex justify-between items-center pt-12 pb-6">
          <div>
            <div className="w-24 h-4 bg-[#E2E8F0] rounded mb-2"></div>
            <div className="w-32 h-8 bg-[#E2E8F0] rounded"></div>
          </div>
          <div className="w-10 h-10 bg-[#E2E8F0] rounded-full"></div>
        </div>
        <div className="w-full h-40 bg-[#E2E8F0] rounded-2xl mb-8"></div>
      </div>
    )
  }

  const streakProgress = streak && streak.today.total > 0 
    ? (streak.today.completed / streak.today.total) 
    : 0

  const circumference = 2 * Math.PI * 28 // radius 28
  const strokeDashoffset = circumference - streakProgress * circumference

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })
  const remainingTasks = todayEvents.filter(t => !t.completed).length

  return (
    <div 
      className="min-h-screen bg-[#F8FAFC] relative pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        {isRefreshing && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-0 right-0 flex justify-center z-50 pointer-events-none"
          >
            <div className="bg-white text-slate-700 px-4 py-2 rounded-full text-sm font-semibold shadow-sm flex items-center gap-2 border border-[#E2E8F0]">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              Refreshing...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* HEADER SECTION */}
      <header className="pt-12 pb-6 px-5 flex justify-between items-center bg-white border-b border-[#E2E8F0]">
        <div>
          <p className="text-slate-500 text-[14px]">{getGreeting()}</p>
          <h1 className="text-[#0F172A] text-[20px] font-bold">{userName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-slate-400" />
          <div className="w-[38px] h-[38px] bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* TODAY SUMMARY CARD */}
      <div className="mx-4 mt-5 rounded-2xl bg-amber-500 text-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex justify-between items-center">
        <div>
          <div className="text-white/70 text-[12px] uppercase tracking-wider">Today</div>
          <div className="text-[18px] font-bold mt-1">{todayStr}</div>
          <div className="text-white/80 text-[14px] mt-1">{remainingTasks} tasks remaining</div>
        </div>
        
        <div className="relative w-[64px] h-[64px] flex items-center justify-center shrink-0">
          <svg className="transform -rotate-90 w-full h-full">
            <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.3)" strokeWidth="4" fill="none" />
            <motion.circle 
              cx="32" cy="32" r="28" 
              stroke="#FFFFFF" 
              strokeWidth="4" 
              fill="none" 
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-white font-bold text-[20px] leading-none mt-1">
              {Math.round(streakProgress * 100)}%
            </span>
            <span className="text-white/70 text-[11px] mt-0.5">done</span>
          </div>
        </div>
      </div>

      {/* CONFLICT WARNING */}
      <AnimatePresence>
        {conflicts.map(conflict => (
          <motion.div 
            key={conflict.date}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-3 bg-orange-50 border border-orange-200 rounded-2xl p-4 overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <span className="text-orange-500 mt-0.5 shrink-0 text-xl">⚡</span>
                <div>
                  <h4 className="text-orange-600 font-semibold text-[14px]">Schedule conflict</h4>
                  <p className="text-slate-500 text-[13px] mt-1">
                    {conflict.events[0]?.title} and {conflict.count - 1} others clash
                  </p>
                </div>
              </div>
              <button onClick={() => dismissConflict(conflict.date)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* TODAY'S TASKS */}
      <section className="mt-5 mb-8">
        <div className="mx-4 mb-3 flex items-center gap-2">
          <h3 className="text-[#0F172A] font-semibold text-[16px]">Today&apos;s Tasks</h3>
          <span className="bg-amber-100 text-amber-700 text-[12px] px-2.5 py-0.5 rounded-full font-bold">
            {todayEvents.length}
          </span>
        </div>
        
        <div className="mx-4 flex flex-col gap-3">
          <AnimatePresence>
            {todayEvents.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-[#0F172A] font-semibold">All done for today!</p>
                <p className="text-slate-400 text-[14px] mt-1">Enjoy your day, {userName}.</p>
              </motion.div>
            ) : (
              todayEvents.map((event) => (
                <TaskCard key={event.id} event={event} onToggle={() => handleToggleComplete(event)} onDelete={() => handleDelete(event.id, true)} />
              ))
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* UPCOMING SECTION */}
      {Object.keys(upcomingGrouped).length > 0 && (
        <section className="mb-10">
          <div className="mx-4 mb-3">
             <h3 className="text-[#0F172A] font-semibold text-[16px]">Coming Up</h3>
          </div>
          {Object.entries(upcomingGrouped).map(([dateLabel, events]) => (
            <div key={dateLabel}>
              <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider mx-4 mt-4 mb-2">
                {dateLabel}
              </h3>
              <div className="mx-4 flex flex-col gap-3">
                {events.map(event => (
                  <TaskCard key={event.id} event={event} onToggle={() => handleToggleComplete(event)} onDelete={() => handleDelete(event.id, false)} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* FLOATING ACTION BUTTON */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 right-5 w-[56px] h-[56px] bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center text-white shadow-[0_4px_15px_rgba(245,158,11,0.4)] z-40"
      >
        <Plus className="w-6 h-6" strokeWidth={3} />
      </motion.button>

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

function TaskCard({ event, onToggle, onDelete }: { event: Event, onToggle: () => void, onDelete: () => void }) {
  const daysInfo = getDaysRemainingLabel(event.event_date)
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: event.completed ? 0.6 : 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex relative overflow-hidden`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full ${getPriorityStyle(event.category, event.priority)}`} />
      
      <div className="flex gap-3 w-full pl-3">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h4 className={`font-semibold text-[15px] leading-tight truncate transition-all ${event.completed ? 'text-slate-400 line-through' : 'text-[#0F172A]'}`}>
              {event.title}
            </h4>
            <button onClick={onDelete} className="text-slate-400 hover:text-red-500 transition-colors shrink-0 -mt-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {event.priority >= 3 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200 bg-orange-50 text-orange-600">
                HIGH
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-600">
              {event.category.toUpperCase()}
            </span>
            <span className="text-slate-500 text-[12px] font-medium">
              {formatTime(event.event_date)}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto ${daysInfo.className}`}>
              {daysInfo.text}
            </span>
          </div>
        </div>

        <button 
          onClick={onToggle}
          className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all mt-1 ${
            event.completed 
              ? 'bg-green-500 border-green-500 scale-110' 
              : 'border-slate-300 bg-white hover:border-amber-400'
          }`}
        >
          {event.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </button>
      </div>
    </motion.div>
  )
}
