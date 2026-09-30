'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Upload, Bell } from 'lucide-react'

const SLIDES = [
  {
    id: 1,
    content: (
      <div className="flex flex-col items-center text-center px-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-8"
        >
          {/* Subtle radial gradient amber glow */}
          <div className="absolute inset-0 bg-amber-500/20 blur-[60px] rounded-full scale-150" />
          <h1 className="text-[48px] font-black text-amber-500 relative z-10 tracking-tighter">
            PulseX
          </h1>
        </motion.div>
        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white text-[28px] font-bold leading-tight mb-4"
        >
          Never miss what matters.
        </motion.h2>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-slate-400 text-[16px]"
        >
          Your AI agent watches your schedule.
        </motion.p>
      </div>
    )
  },
  {
    id: 2,
    content: (
      <div className="flex flex-col items-center text-center px-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-8 relative"
        >
          <div className="absolute inset-0 bg-amber-500/20 blur-[40px] rounded-full" />
          <Upload className="w-12 h-12 text-amber-500 relative z-10" />
        </motion.div>
        <h2 className="text-white text-[28px] font-bold leading-tight mb-4">
          Upload once.
        </h2>
        <p className="text-slate-400 text-[16px] leading-relaxed">
          Drop your timetable PDF, Excel, or Word file. <br/>
          AI reads it and creates all your reminders.
        </p>
      </div>
    )
  },
  {
    id: 3,
    content: (
      <div className="flex flex-col items-center text-center px-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-8 relative"
        >
          <div className="absolute inset-0 bg-amber-500/20 blur-[40px] rounded-full" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Bell className="w-12 h-12 text-amber-500 relative z-10" />
          </motion.div>
        </motion.div>
        <h2 className="text-white text-[28px] font-bold leading-tight mb-4">
          Agent reminds you.
        </h2>
        <p className="text-slate-400 text-[16px] leading-relaxed">
          Exams get 4 reminders. Meetings get 2. <br/>
          Priority-aware, automatically.
        </p>
      </div>
    )
  }
]

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const router = useRouter()

  const nextSlide = () => {
    if (currentSlide === SLIDES.length - 1) {
      router.push('/login')
    } else {
      setCurrentSlide(prev => prev + 1)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col justify-between pt-20 pb-10 overflow-hidden relative">
      
      {/* Slides Area */}
      <div className="flex-1 flex items-center justify-center relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) * velocity.x;
              if (swipe < -100 && currentSlide < SLIDES.length - 1) {
                nextSlide();
              } else if (swipe > 100 && currentSlide > 0) {
                setCurrentSlide(currentSlide - 1);
              }
            }}
          >
            {SLIDES[currentSlide].content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="px-6 flex flex-col items-center w-full">
        <div className="flex gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'bg-amber-500 w-6' : 'bg-[#1F2937]'
              }`}
            />
          ))}
        </div>

        <button 
          onClick={nextSlide}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl transition-all active:scale-95 text-[18px]"
        >
          {currentSlide === SLIDES.length - 1 ? 'Get Started →' : 'Next'}
        </button>
      </div>

    </div>
  )
}
