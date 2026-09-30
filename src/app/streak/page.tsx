'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

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
      <div className="min-h-screen bg-[#0A0F1E] p-6 animate-pulse">
        <div className="w-32 h-8 bg-[#1F2937] rounded mb-12"></div>
        <div className="w-40 h-40 rounded-full bg-[#1F2937] mx-auto mb-12"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-[#1F2937] rounded-2xl"></div>
          <div className="h-24 bg-[#1F2937] rounded-2xl"></div>
          <div className="h-24 bg-[#1F2937] rounded-2xl"></div>
          <div className="h-24 bg-[#1F2937] rounded-2xl"></div>
        </div>
      </div>
    )
  }

  const radius = 70
  const circumference = 2 * Math.PI * radius
  const progress = data.today.total > 0 ? data.today.completed / data.today.total : 0
  const strokeDashoffset = circumference - progress * circumference

  const remaining = data.today.total - data.today.completed

  // Ensure weekly data is structured for recharts
  const chartData = data.weekly_data.map(d => ({
    name: d.day,
    completed: d.completed,
    isEmpty: d.completed === 0
  }))

  return (
    <div className="min-h-screen bg-[#0A0F1E] pb-24">
      <header className="pt-12 px-5 mb-8">
        <h1 className="text-[28px] font-bold text-white tracking-tight">Progress</h1>
      </header>

      {/* TODAY RING HERO */}
      <div className="flex flex-col items-center mb-10 relative">
        <div className="relative w-[160px] h-[160px] flex justify-center items-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="80" cy="80" r="70" stroke="#1F2937" strokeWidth="12" fill="none" />
            <motion.circle 
              cx="80" cy="80" r="70" 
              stroke="#F59E0B" 
              strokeWidth="12" 
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: ANIMATION_DURATION, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[40px] font-black text-white leading-none">
              <CountUp end={Math.round(progress * 100)} />%
            </span>
            <span className="text-slate-400 text-[12px] font-medium">today</span>
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-6 font-medium">
          {data.today.completed} tasks done · {remaining} remaining
        </p>

        {/* STREAK NUMBER */}
        <div className="mt-8 flex items-center gap-2">
          <span className="text-[28px]">🔥</span>
          <span className="text-[48px] font-black text-white leading-none tracking-tight">
            <CountUp end={data.current_streak} />
          </span>
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-sm mt-2">
            day streak
          </span>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="px-5 mb-12">
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Events" value={data.total_events} />
          <StatCard label="Completed" value={data.completed_events} />
          <StatCard label="This Week" value={data.this_week} />
          <StatCard label="Best Streak" value={data.best_streak} />
        </div>
      </div>

      {/* 30-DAY CALENDAR */}
      <div className="px-5 mb-12">
        <h2 className="text-white font-bold text-lg mb-4">Last 30 Days</h2>
        <div className="bg-[#111827] rounded-3xl p-5 border border-[#1F2937]">
          <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center mb-3">
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <span key={i} className="text-slate-600 text-[10px] font-bold">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-3 gap-x-2 justify-items-center">
            {data.last_30_days.map((day, i) => {
              // Adjust layout slightly for nice spacing
              return (
                <motion.div
                  key={day.date}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.015 }}
                  className={`w-[36px] h-[36px] rounded-lg flex items-center justify-center
                    ${day.completed ? 'bg-green-500' : 'bg-[#1F2937]'}
                    ${day.isToday ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-[#111827]' : ''}
                  `}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* WEEKLY CHART */}
      <div className="px-5 mb-8">
        <h2 className="text-white font-bold text-lg mb-4">This Week</h2>
        <div className="bg-[#111827] rounded-3xl p-5 border border-[#1F2937] h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                dy={10}
              />
              <Tooltip 
                cursor={{ fill: '#1F2937', radius: 4 }}
                contentStyle={{ backgroundColor: '#0A0F1E', border: '1px solid #1F2937', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#F59E0B', fontWeight: 'bold' }}
                formatter={(value: number | string | readonly (number | string)[] | undefined) => {
                  const num = typeof value === 'number' ? value : 0
                  return [`${num} tasks`, 'Completed'] as [string, string]
                }}
                labelStyle={{ display: 'none' }}
              />
              <Bar 
                dataKey="completed" 
                radius={[4, 4, 4, 4]} 
                fill="#F59E0B"
                // Recharts doesn't natively support dynamic fills per bar easily without custom shape, 
                // but we can pass a function to shape or use standard fill since the requirement says "amber for completed, empty for empty".
                // We'll map the data to show small bars for 0 so it's visible.
                minPointSize={4}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}

function StatCard({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-[#111827] rounded-2xl p-5 text-center border border-[#1F2937]">
      <div className="text-[28px] font-black text-amber-500 leading-tight">
        <CountUp end={value} />
      </div>
      <div className="text-slate-400 text-[12px] uppercase tracking-wider font-semibold mt-1">
        {label}
      </div>
    </div>
  )
}
