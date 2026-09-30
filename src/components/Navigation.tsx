'use client'

import { Home, Plus, Flame, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'


const navItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Add', href: '/upload', icon: Plus }, // Or open modal
  { name: 'Streak', href: '/streak', icon: Flame },
  { name: 'Profile', href: '/profile', icon: User },
]

export function Navigation() {
  const pathname = usePathname()

  // Hide nav on onboarding or auth pages
  if (['/onboarding', '/login', '/signup', '/'].includes(pathname)) {
    return null
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 border-r border-[#E2E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 mb-10 text-amber-500 font-bold text-2xl tracking-tight">
          <Flame fill="currentColor" size={28} />
          PulseX
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href} className="outline-none">
                <div
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-amber-50 text-amber-500' 
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <item.icon 
                    size={20} 
                    className={isActive ? 'text-amber-500' : 'text-slate-400'} 
                    fill={isActive && item.name !== 'Add' ? 'currentColor' : 'none'}
                  />
                  <span className="font-semibold">{item.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-[#E2E8F0] shadow-[0_-1px_10px_rgba(0,0,0,0.06)] pb-safe">
        <nav className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href} className="flex-1 flex flex-col items-center justify-center h-full outline-none">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1 relative w-full h-full justify-center"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-glow"
                      className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full w-8 h-8 m-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                  <item.icon
                    size={22}
                    className={`relative z-10 transition-colors ${isActive ? 'text-amber-500' : 'text-slate-400'}`}
                    fill={isActive && item.name !== 'Add' ? 'currentColor' : 'none'}
                  />
                  <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-amber-500' : 'text-slate-400'}`}>
                    {item.name}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute bottom-1 w-1 h-1 bg-amber-500 rounded-full"
                    />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
