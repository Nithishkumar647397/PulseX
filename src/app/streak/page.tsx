'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Calendar, CheckCircle2, TrendingUp, Flame } from 'lucide-react'

type StreakData = {
  current_streak: number
  best_streak: number
  total_events: number
  completed_events: number
  this_week: number
  today: {
    total: number
    completed: number
    ratio: number
  }
  last_30_days: {
    date: string
    completed: boolean
    isToday: boolean
  }[]
  weekly_data: {
    day: string
    completed: number
    total: number
  }[]
}

const ANIMATION_DURATION = 1

function CountUp({ end, duration = ANIMATION_DURATION }: { end: number, duration?: number }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number | null = null
    const animate = (time: number) => {
      if (!startTime) startTime = time
      const progress = (time - startTime) / (duration * 1000)
      if (progress < 1) {
        setCount(Math.floor(end * progress))
        requestAnimationFrame(animate)
      } else {
        setCount(end)
      }
    }
    requestAnimationFrame(animate)
  }, [end, duration])

  return <span>{count}</span>
}

export default function StreakPage() {
  const [data, setData] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const [resStreak, resFull] = await Promise.all([
          fetch('/api/streak'),
          fetch('/api/streak/full')
        ])
        if (resStreak.ok && resFull.ok) {
          const streakJson = await resStreak.json()
          const fullJson = await resFull.json()
          setData({
             current_streak: streakJson.current_streak,
             today: streakJson.today,
             total_events: fullJson.stats.total,
             completed_events: fullJson.stats.completed,
             this_week: fullJson.stats.thisWeek,
             best_streak: fullJson.stats.longestStreak,
             last_30_days: fullJson.calendar.map((c: { date: string, completed: boolean, isToday: boolean }) => ({ date: c.date, completed: c.completed, isToday: c.isToday })),
             weekly_data: fullJson.weekData.map((w: { day: string, completed: number, total: number }) => ({ day: w.day, completed: w.completed, total: w.total }))
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStreak()
  }, [])

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 animate-pulse">
        <div className="w-32 h-8 bg-[#E2E8F0] rounded mb-12"></div>
        <div className="w-full h-40 rounded-3xl bg-[#E2E8F0] mx-auto mb-12"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-[#E2E8F0] rounded-2xl"></div>
          <div className="h-24 bg-[#E2E8F0] rounded-2xl"></div>
          <div className="h-24 bg-[#E2E8F0] rounded-2xl"></div>
          <div className="h-24 bg-[#E2E8F0] rounded-2xl"></div>
        </div>
      </div>
    )
  }

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const progress = data.today.total > 0 ? data.today.completed / data.today.total : 0
  const strokeDashoffset = circumference - progress * circumference

  // Ensure weekly data is structured for recharts
  const chartData = data.weekly_data.map(d => ({
    name: d.day,
    completed: d.completed,
    isEmpty: d.completed === 0
  }))

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* HEADER */}
      <header className="bg-white border-b border-[#E2E8F0] px-5 pt-12 pb-5">
        <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight">Progress</h1>
      </header>

      {/* STREAK HERO */}
      <div className="mx-4 mt-4 bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[32px]">🔥</span>
              <span className="text-[48px] font-black text-amber-500 leading-none">
                <CountUp end={data.current_streak} />
              </span>
            </div>
            <p className="text-slate-500 text-[14px] mt-1 ml-11">day streak</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative w-[80px] h-[80px] flex justify-center items-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="36" stroke="#E2E8F0" strokeWidth="6" fill="none" />
                <motion.circle 
                  cx="40" cy="40" r="36" 
                  stroke="#F59E0B" 
                  strokeWidth="6" 
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: ANIMATION_DURATION, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center bg-white rounded-full w-[64px] h-[64px]">
                <span className="text-[16px] font-bold text-amber-500 leading-none">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-[11px] mt-2">today</p>
          </div>
        </div>
        
        <div className="h-px bg-[#E2E8F0] w-full my-5" />
        
        <div className="flex justify-between items-center text-center">
          <div className="flex-1">
            <div className="text-[20px] font-bold text-amber-500">{data.today.completed}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Done Today</div>
          </div>
          <div className="w-px h-8 bg-[#E2E8F0]" />
          <div className="flex-1">
            <div className="text-[20px] font-bold text-amber-500">{data.this_week}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">This Week</div>
          </div>
          <div className="w-px h-8 bg-[#E2E8F0]" />
          <div className="flex-1">
            <div className="text-[20px] font-bold text-amber-500">{data.best_streak}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Best Streak</div>
          </div>
        </div>
      </div>

      {/* 30-DAY CALENDAR */}
      <div className="mx-4 mt-5 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
        <h2 className="text-[#0F172A] font-semibold text-[16px] mb-4">Last 30 Days</h2>
        <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center mb-3">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <span key={i} className="text-slate-400 text-[12px] font-medium">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-3 gap-x-2 justify-items-center">
          {data.last_30_days.map((day, i) => (
            <motion.div
              key={day.date}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.015 }}
              className={`w-[36px] h-[36px] rounded-lg flex items-center justify-center
                ${day.completed ? 'bg-green-400' : (day.isToday ? 'bg-amber-50' : (new Date(day.date) > new Date() ? 'bg-slate-50' : 'bg-slate-100'))}
                ${day.isToday ? 'ring-2 ring-amber-500' : ''}
              `}
            />
          ))}
        </div>
        <div className="flex justify-center items-center gap-4 mt-5">
          <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-400" /> Completed
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
            <div className="w-2 h-2 rounded-full bg-amber-50 ring-1 ring-amber-500" /> Today
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
            <div className="w-2 h-2 rounded-full bg-slate-100" /> Missed
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Total Events" value={data.total_events} icon={<Calendar className="w-5 h-5 text-slate-400" />} color="text-amber-500" />
        <StatCard label="Completed" value={data.completed_events} icon={<CheckCircle2 className="w-5 h-5 text-slate-400" />} color="text-green-500" />
        <StatCard label="This Week" value={data.this_week} icon={<TrendingUp className="w-5 h-5 text-slate-400" />} color="text-blue-500" />
        <StatCard label="Best Streak" value={data.best_streak} icon={<Flame className="w-5 h-5 text-slate-400" />} color="text-orange-500" />
      </div>

      {/* WEEKLY CHART */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
        <h2 className="text-[#0F172A] font-semibold text-[16px] mb-4">This Week</h2>
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94A3B8', fontSize: 12 }} 
                dy={10}
              />
              <Tooltip 
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#0F172A', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ color: '#0F172A', fontWeight: 'bold' }}
                formatter={(value: number | string | readonly (number | string)[] | undefined) => {
                  const num = typeof value === 'number' ? value : 0
                  return [`${num} tasks`, 'Completed'] as [string, string]
                }}
                labelStyle={{ display: 'none' }}
              />
              <Bar 
                dataKey="completed" 
                radius={[4, 4, 0, 0]} 
                fill="#FBBF24"
                minPointSize={4}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 relative border border-[#E2E8F0] shadow-sm">
      <div className="absolute top-4 right-4">
        {icon}
      </div>
      <div className={`text-[28px] font-black leading-tight ${color}`}>
        <CountUp end={value} />
      </div>
      <div className="text-slate-500 text-[12px] uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  )
}
