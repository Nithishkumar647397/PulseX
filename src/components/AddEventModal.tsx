'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, Loader2 } from 'lucide-react'

type PriorityClass = {
  priority: number
  keyword: string | null
}

const CATEGORIES = [
  { id: 'General', label: 'General' },
  { id: 'Exam', label: 'Exam' },
  { id: 'Assignment', label: 'Assignment' },
  { id: 'Meeting', label: 'Meeting' },
  { id: 'Deadline', label: 'Deadline' },
  { id: 'Birthday', label: 'Birthday' },
  { id: 'Personal', label: 'Personal' }
]

export default function AddEventModal({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void
  onSuccess: () => void 
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [category, setCategory] = useState('General')
  const [autoPriority, setAutoPriority] = useState<PriorityClass>({ priority: 1, keyword: null })
  const [manualPriority, setManualPriority] = useState<number | null>(null)
  const [showPriorityOverride, setShowPriorityOverride] = useState(false)
  const [repeatYearly, setRepeatYearly] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Drag to dismiss
  const dragConstraintsRef = useRef(null)

  // Debounced Classification
  useEffect(() => {
    if (!title.trim()) {
      // eslint-disable-next-line
      setAutoPriority({ priority: 1, keyword: null })
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/classify?title=${encodeURIComponent(title)}`)
        if (res.ok) {
          const data = await res.json()
          setAutoPriority(data)
          if (data.keyword) {
            const kw = data.keyword.toLowerCase()
            if (['exam', 'viva', 'test'].includes(kw)) setCategory('Exam')
            else if (['assignment', 'deadline', 'submission'].includes(kw)) setCategory('Assignment')
            else if (['meeting', 'lecture', 'seminar'].includes(kw)) setCategory('Meeting')
          }
        }
      } catch (err) { console.error(err) }
    }, 400)
    return () => clearTimeout(timer)
  }, [title])

  const activePriority = manualPriority !== null ? manualPriority : autoPriority.priority
  const isFormValid = title.trim() && date && time && category

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return
    setIsSubmitting(true)
    
    try {
      const event_date = new Date(`${date}T${time}`).toISOString()
      
      const payload: { title: string; category: string; event_date: string; priority: number } = {
        title,
        event_date,
        category: category.toLowerCase(),
        priority: activePriority,
        // (repeatYearly could be saved here if backend supports it)
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        onSuccess()
      } else {
        alert('Failed to add task.')
        setIsSubmitting(false)
      }
    } catch (err) {
      console.error(err)
      setIsSubmitting(false)
    }
  }

  const getPriorityLabel = (p: number) => {
    if (p >= 4) return 'MAX'
    if (p === 3) return 'High'
    if (p === 2) return 'Medium'
    return 'Low'
  }

  const getCategoryEmoji = (c: string) => {
    if (c === 'Exam') return '🔴'
    if (c === 'Assignment') return '🔵'
    if (c === 'Meeting') return '🟣'
    return '⚪'
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center" ref={dragConstraintsRef}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
        />
        
        <motion.div 
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, info) => {
            if (info.offset.y > 100) onClose()
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="relative w-full max-w-[430px] bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-[#E2E8F0]"
        >
          {/* Handle */}
          <div className="w-[36px] h-[4px] bg-[#E2E8F0] rounded-full mx-auto mt-3 shrink-0" />
          
          {/* Header */}
          <div className="flex justify-between items-center px-6 pt-4 pb-2 shrink-0">
            <h2 className="text-[#0F172A] font-bold text-[18px]">New Event</h2>
            <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-6 pb-safe">
            <div className="py-4 space-y-6">
              
              {/* Title */}
              <div>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you need to do?"
                  className="w-full bg-transparent border-0 border-b border-[#E2E8F0] focus:border-amber-400 text-[#0F172A] text-[18px] py-2 px-0 outline-none transition-colors placeholder:text-slate-400"
                  autoFocus
                />
              </div>

              {/* Date + Time */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#E2E8F0] focus:border-amber-400 focus:ring-1 focus:ring-amber-100 rounded-full outline-none text-[#0F172A] transition-all shadow-sm"
                  />
                </div>
                <div className="flex-1 relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#E2E8F0] focus:border-amber-400 focus:ring-1 focus:ring-amber-100 rounded-full outline-none text-[#0F172A] transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Categories */}
              <div>
                <div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-2 scrollbar-hide">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-full border transition-all ${
                        category === cat.id 
                          ? 'bg-amber-100 border-amber-200 text-amber-700 font-bold' 
                          : 'bg-white border-[#E2E8F0] text-slate-500 hover:border-amber-300 hover:bg-slate-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
                {!showPriorityOverride ? (
                  <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setShowPriorityOverride(true)}
                  >
                    <span className="text-[#0F172A] font-medium">
                      Auto-detected: {getCategoryEmoji(category)} {getPriorityLabel(activePriority)}
                    </span>
                    <span className="text-amber-500 text-sm font-bold">Edit</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Set Priority</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map(p => (
                        <button
                          key={p}
                          onClick={() => { setManualPriority(p); setShowPriorityOverride(false) }}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                            activePriority === p 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-white text-slate-500 border border-[#E2E8F0] hover:bg-slate-50'
                          }`}
                        >
                          {p === 1 ? 'LOW' : p === 2 ? 'MED' : p === 3 ? 'HIGH' : 'MAX'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Repeat Yearly Toggle (Birthday only) */}
              <AnimatePresence>
                {category === 'Birthday' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between items-center overflow-hidden"
                  >
                    <span className="text-[#0F172A] font-medium">Repeat yearly</span>
                    <button 
                      onClick={() => setRepeatYearly(!repeatYearly)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${repeatYearly ? 'bg-amber-500' : 'bg-slate-200'}`}
                    >
                      <motion.div 
                        layout
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: repeatYearly ? 24 : 0 }}
                      />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Save Button */}
              <div className="pt-4 pb-8">
                <button 
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm font-bold py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add to Schedule'}
                </button>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
