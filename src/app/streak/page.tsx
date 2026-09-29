'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts'
import { 
  Home, 
  CalendarDays, 
  Zap, 
  User,
  TrendingUp,
  Target,
  Award,
  CheckCircle2
} from 'lucide-react'

export default function StreakPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchStreakData = async () => {
      try {
        const res = await fetch('/api/streak/full')
        if (res.status === 401) router.push('/login')
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStreakData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 animate-pulse pb-24">
        <div className="w-32 h-8 bg-surface rounded mb-8"></div>
        <div className="w-full h-48 bg-surface rounded-2xl mb-6"></div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="h-24 bg-surface rounded-2xl"></div>
          <div className="h-24 bg-surface rounded-2xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-text-primary">
      <header className="px-6 py-6 border-b border-border">
        <h1 className="text-3xl font-black text-white">Your Progress</h1>
      </header>

      <main className="p-5 max-w-[480px] mx-auto space-y-6">
        
        {/* Weekly Chart */}
        <div className="card-pulse p-6 text-center">
          <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-accent-amber" />
            Weekly Activity
          </h2>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.weekData || []}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 12 }} 
                  dy={10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }}
                  contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar 
                  dataKey="tasks" 
                  fill="#F59E0B" 
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-pulse p-5 text-center flex flex-col items-center">
            <Target className="w-6 h-6 text-blue-400 mb-2" />
            <h3 className="text-3xl font-black text-white">{data?.stats?.total || 0}</h3>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Total Events</p>
          </div>
          <div className="card-pulse p-5 text-center flex flex-col items-center">
            <CheckCircle2 className="w-6 h-6 text-success-green mb-2" />
            <h3 className="text-3xl font-black text-white">{data?.stats?.completed || 0}</h3>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Completed</p>
          </div>
          <div className="card-pulse p-5 text-center flex flex-col items-center">
            <Award className="w-6 h-6 text-purple mb-2" />
            <h3 className="text-3xl font-black text-white">{data?.stats?.longestStreak || 0}</h3>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Longest Streak</p>
          </div>
          <div className="card-pulse p-5 text-center flex flex-col items-center">
            <TrendingUp className="w-6 h-6 text-accent-amber mb-2" />
            <h3 className="text-3xl font-black text-white">{data?.stats?.thisWeek || 0}</h3>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Done This Week</p>
          </div>
        </div>

        {/* 30 Day Calendar */}
        <div className="card-pulse p-6">
          <h2 className="text-lg font-bold text-white mb-4">Last 30 Days</h2>
          <div className="flex flex-wrap gap-2">
            {data?.calendar?.map((day: any, i: number) => (
              <div 
                key={i}
                className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all
                  ${day.isToday ? 'ring-2 ring-accent-amber ring-offset-2 ring-offset-background' : ''}
                  ${day.completed ? 'bg-success-green text-background' : 'bg-surface border border-border text-text-muted'}
                `}
                title={`${day.date}: ${day.tasksDone} tasks done`}
              >
                {new Date(day.date).getDate()}
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border px-6 py-3 pb-safe z-30">
        <div className="max-w-[480px] mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-text-muted hover:text-white transition-colors">
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/upload" className="flex flex-col items-center gap-1 text-text-muted hover:text-white transition-colors">
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-medium">Add</span>
          </Link>
          <Link href="/streak" className="flex flex-col items-center gap-1 text-accent-amber relative">
            <Zap className="w-6 h-6" />
            <span className="text-[10px] font-bold">Streak</span>
            <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-accent-amber"></div>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-text-muted hover:text-white transition-colors">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
