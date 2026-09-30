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
  Check,
  Flame
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
  if (hour < 12) return 'Good morning,'
  if (hour < 18) return 'Good afternoon,'
  return 'Good evening,'
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
  
  if (diffDays === 0) return { text: 'TODAY', className: 'bg-red-500 text-white font-bold' }
  if (diffDays === 1) return { text: 'TOMORROW', className: 'bg-orange-500/15 text-orange-400' }
  if (diffDays === 2) return { text: 'in 2 days', className: 'bg-amber-500/15 text-amber-400' }
  if (diffDays < 0) return { text: 'OVERDUE', className: 'bg-red-500 text-white font-bold' }
  return { text: `in ${diffDays} days`, className: 'bg-slate-700 text-slate-400' }
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getPriorityStyle = (category: string, priority: number) => {
  // Exam: border-l-[3px] border-l-red-500
  // High: border-l-[3px] border-l-orange-500
  // Medium: border-l-[3px] border-l-blue-500
  // Low: border-l-[3px] border-l-slate-600
  if (category.toLowerCase() === 'exam') return 'border-l-[3px] border-l-red-500'
  if (priority >= 3) return 'border-l-[3px] border-l-orange-500'
  if (priority === 2) return 'border-l-[3px] border-l-blue-500'
  return 'border-l-[3px] border-l-slate-600'
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
  const [showConfetti, setShowConfetti] = useState<{show: boolean, streak: number}>({show: false, streak: 0})

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

      if (streakData && [7, 14, 21, 30].includes(streakData.current_streak)) {
         if (!localStorage.getItem(`streak_confetti_${streakData.current_streak}`)) {
            import('canvas-confetti').then((confetti) => {
              confetti.default({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#F59E0B', '#EF4444', '#10B981', '#3B82F6']
              })
              setShowConfetti({ show: true, streak: streakData.current_streak })
              setTimeout(() => setShowConfetti({ show: false, streak: 0 }), 4000)
              localStorage.setItem(`streak_confetti_${streakData.current_streak}`, 'true')
            })
         }
      }

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
      fetchData() // Refresh streak and everything
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
    
    // Create header label, e.g. "TOMORROW · TUE 22 JUL"
    let headerLabel = `${dateStr}`
    if (dayLabel === 'TOMORROW') headerLabel = `TOMORROW · ${dateStr}`
    else if (dayLabel === 'in 2 days') headerLabel = `IN 2 DAYS · ${dateStr}`
    
    headerLabel = headerLabel.toUpperCase()

    if (!acc[headerLabel]) acc[headerLabel] = []
    acc[headerLabel].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] p-5 animate-pulse">
        <div className="flex justify-between items-center pt-12 pb-6">
          <div>
            <div className="w-24 h-4 bg-[#1F2937] rounded mb-2"></div>
            <div className="w-32 h-8 bg-[#1F2937] rounded"></div>
          </div>
          <div className="w-10 h-10 bg-[#1F2937] rounded-full"></div>
        </div>
        <div className="w-full h-40 bg-[#1F2937] rounded-3xl mb-8"></div>
      </div>
    )
  }

  const streakProgress = streak && streak.today.total > 0 
    ? (streak.today.completed / streak.today.total) 
    : 0

  const circumference = 2 * Math.PI * 32 // radius 32
  const strokeDashoffset = circumference - streakProgress * circumference

  return (
    <div 
      className="min-h-screen bg-[#0A0F1E] relative"
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
            <div className="bg-[#1F2937] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2 border border-[#374151]">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              Refreshing...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showConfetti.show && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-10 left-4 right-4 z-50 flex justify-center"
          >
            <div className="bg-amber-500 text-black px-6 py-3 rounded-2xl shadow-2xl font-black text-xl">
              🔥 {showConfetti.streak} day streak!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* HEADER SECTION */}
      <header className="pt-12 pb-6 px-5 flex justify-between items-center">
        <div>
          <p className="text-slate-400 text-[14px]">{getGreeting()}</p>
          <h1 className="text-white text-[24px] font-bold">{userName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-slate-400" />
          <div className="w-[42px] h-[42px] bg-amber-500 text-black rounded-full flex items-center justify-center font-bold text-lg">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* STREAK HERO CARD */}
      {streak && (
        <div className="mx-5 mb-8 rounded-3xl bg-gradient-to-r from-[#78350f] via-[#92400e] to-[#78350f] border border-amber-500/30 p-6 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex justify-between items-center">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[32px]">🔥</span>
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[48px] font-black text-amber-500 leading-none"
              >
                {streak.current_streak}
              </motion.span>
              <span className="text-slate-300 text-[12px] uppercase tracking-wider font-semibold">day streak</span>
            </div>
            
            <div className="mt-4 w-full">
              <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${streakProgress * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-amber-500 h-full rounded-full" 
                />
              </div>
              <p className="text-slate-300 text-[12px] mt-2 font-medium">
                {streak.today.completed}/{streak.today.total} tasks today
              </p>
            </div>
          </div>
          
          <div className="relative w-[72px] h-[72px] flex items-center justify-center shrink-0">
            <svg className="transform -rotate-90 w-full h-full">
              <circle cx="36" cy="36" r="32" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
              <motion.circle 
                cx="36" cy="36" r="32" 
                stroke="#F59E0B" 
                strokeWidth="6" 
                fill="none" 
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-white font-bold text-[16px] leading-none">
                {Math.round(streakProgress * 100)}%
              </span>
              <span className="text-slate-300 text-[10px]">complete</span>
            </div>
          </div>
        </div>
      )}

      {/* CONFLICT WARNING */}
      <AnimatePresence>
        {conflicts.map(conflict => (
          <motion.div 
            key={conflict.date}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-5 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-amber-500 font-semibold">Conflict on {new Date(conflict.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</h4>
                  <p className="text-slate-400 text-[13px] mt-1">
                    {conflict.events[0]?.title} and {conflict.count - 1} others clash
                  </p>
                </div>
              </div>
              <button onClick={() => dismissConflict(conflict.date)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* TODAY'S TASKS */}
      <section className="mb-8">
        <div className="mx-5 mb-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-[18px]">Today</h3>
          <span className="bg-[#1F2937] text-slate-400 text-[12px] px-3 py-1 rounded-full font-medium">
            {todayEvents.length} Tasks
          </span>
        </div>
        
        <div className="mx-4 flex flex-col gap-2">
          <AnimatePresence>
            {todayEvents.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 bg-[#111827] rounded-2xl border border-[#1F2937]">
                <p className="text-slate-500 font-medium">All caught up for today!</p>
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
        <section className="mb-10 pb-20">
          {Object.entries(upcomingGrouped).map(([dateLabel, events]) => (
            <div key={dateLabel}>
              <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mx-5 mt-6 mb-3">
                {dateLabel}
              </h3>
              <div className="mx-4 flex flex-col gap-2">
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
        className="fixed bottom-20 right-5 w-[56px] h-[56px] bg-amber-500 hover:bg-amber-400 rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(245,158,11,0.4)] z-40"
      >
        <Plus className="w-6 h-6" strokeWidth={3} />
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/50 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
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
      className={`bg-[#111827] border border-[#1F2937] rounded-2xl p-4 ${getPriorityStyle(event.category, event.priority)}`}
    >
      <div className="flex gap-3">
        {/* Checkbox */}
        <button 
          onClick={onToggle}
          className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
            event.completed 
              ? 'bg-green-500 border-green-500 scale-110' 
              : 'border-[#2D3F55] hover:border-amber-500'
          }`}
        >
          {event.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h4 className={`font-semibold text-[15px] leading-tight truncate transition-all ${event.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
              {event.title}
            </h4>
            <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {event.priority >= 3 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1F2937] text-orange-400">
                HIGH
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1F2937] text-slate-300">
              {event.category.toUpperCase()}
            </span>
            <span className="text-slate-400 text-[12px] font-medium">
              {formatTime(event.event_date)}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ml-auto ${daysInfo.className}`}>
              {daysInfo.text}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
