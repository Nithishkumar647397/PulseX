'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  CloudUpload, 
  CheckCircle2, 
  Loader2,
  ChevronDown
} from 'lucide-react'

type ExtractedEvent = {
  id: string
  title: string
  event_date: string
  category: string
  priority: number
  selected: boolean
  inputDate: string
  inputTime: string
}

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<'upload' | 'reading' | 'preview' | 'success'>('upload')
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setMode('reading')
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to extract file')
      
      const events: ExtractedEvent[] = data.events.map((ev: { event_date: string, title: string, category: string, priority: number }) => {
        const d = new Date(ev.event_date)
        return {
          ...ev,
          selected: true,
          inputDate: d.toISOString().split('T')[0],
          inputTime: '09:00'
        }
      })

      setExtractedEvents(events)
      setMode('preview')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Unknown error')
      setMode('upload')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRowChange = (index: number, field: keyof ExtractedEvent, value: string | number | boolean) => {
    const updated = [...extractedEvents]
    updated[index] = { ...updated[index], [field]: value }
    setExtractedEvents(updated)
  }

  const handleBulkSubmit = async () => {
    const selectedEvents = extractedEvents.filter(e => e.selected)
    if (selectedEvents.length === 0 || isSubmitting) return
    setIsSubmitting(true)

    try {
      for (const ev of selectedEvents) {
        if (!ev.title.trim() || !ev.inputDate || !ev.inputTime) continue
        const event_date = new Date(`${ev.inputDate}T${ev.inputTime}`).toISOString()
        const payload = {
          title: ev.title,
          event_date,
          category: ev.category,
          priority: ev.priority
        }
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }
      setMode('success')
    } catch (err) {
      console.error(err)
      alert('Import failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (mode === 'success') {
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [mode, router])

  const selectedCount = extractedEvents.filter(e => e.selected).length

  return (
    <div className="min-h-screen bg-[#0A0F1E] pt-12 pb-24 font-sans flex flex-col items-center">
      
      {/* HEADER */}
      <header className="w-full px-5 mb-8">
        <h1 className="text-[24px] font-bold text-white">Import Schedule</h1>
      </header>

      {/* UPLOAD STATE */}
      <AnimatePresence mode="wait">
        {mode === 'upload' && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full px-4"
          >
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".pdf,.docx,.xlsx,.csv"
              onChange={handleFileUpload}
              className="hidden" 
              id="file-upload"
            />
            <label 
              htmlFor="file-upload" 
              className="block bg-[#111827] border-2 border-dashed border-[#1F2937] hover:border-amber-500/50 hover:bg-amber-500/5 transition-all rounded-3xl p-10 text-center cursor-pointer"
            >
              <CloudUpload className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-white text-[16px] font-semibold mb-1">Drop your file here</p>
              <p className="text-slate-500 text-[14px] mb-6">or tap to browse</p>
              
              <div className="flex justify-center gap-2">
                <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2.5 py-1 rounded-md border border-red-500/20">PDF</span>
                <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-md border border-blue-500/20">DOCX</span>
                <span className="bg-green-500/10 text-green-400 text-xs font-bold px-2.5 py-1 rounded-md border border-green-500/20">XLSX</span>
                <span className="bg-amber-500/10 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-500/20">CSV</span>
              </div>
            </label>

            {/* Manual Entry Toggle */}
            <div className="mt-8">
              <button 
                onClick={() => setShowManual(!showManual)}
                className="flex items-center gap-2 text-slate-400 font-semibold text-sm mx-auto hover:text-white transition-colors"
              >
                Or add manually <ChevronDown className={`w-4 h-4 transition-transform ${showManual ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {showManual && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[#111827] border border-[#1F2937] rounded-3xl p-6 mt-4">
                      {/* Simple inline form placeholder */}
                      <p className="text-slate-400 text-sm text-center mb-4">Use the (+) button to add manually.</p>
                      <button onClick={() => router.push('/dashboard')} className="w-full bg-[#1F2937] text-white py-3 rounded-xl font-semibold">
                        Go to Dashboard
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* READING STATE */}
        {mode === 'reading' && (
          <motion.div 
            key="reading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex flex-col items-center justify-center mt-20"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-amber-500/20 blur-[30px] rounded-full" />
              <FileTextIcon className="w-16 h-16 text-amber-500 relative z-10 animate-bounce" />
            </div>
            <h2 className="text-slate-300 text-xl font-bold mb-2">Reading your file...</h2>
            <p className="text-slate-500 text-[13px] mb-8">AI is extracting dates and events</p>
            
            <div className="w-48 h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-amber-500 rounded-full w-1/2"
                animate={{ x: [-100, 200] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}

        {/* PREVIEW STATE */}
        {mode === 'preview' && (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full px-4 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-[18px] font-bold">
                Found {extractedEvents.length} events
              </span>
            </div>

            <div className="bg-[#111827] rounded-2xl border border-[#1F2937] overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-4 py-3 bg-[#1F2937]/50 border-b border-[#1F2937] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="w-5"></div>
                <div>Event</div>
                <div>Date</div>
                <div>Pri</div>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto">
                {extractedEvents.map((ev, i) => (
                  <div 
                    key={i} 
                    className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-3 border-b border-[#1F2937]/50 last:border-0 ${i % 2 === 0 ? 'bg-[#111827]' : 'bg-[#0F172A]'}`}
                  >
                    <input 
                      type="checkbox"
                      checked={ev.selected}
                      onChange={(e) => handleRowChange(i, 'selected', e.target.checked)}
                      className="w-5 h-5 rounded bg-[#0A0F1E] border-[#1F2937] text-amber-500 focus:ring-amber-500"
                    />
                    <input 
                      type="text"
                      value={ev.title}
                      onChange={(e) => handleRowChange(i, 'title', e.target.value)}
                      className="bg-transparent text-white text-sm font-medium w-full outline-none focus:border-b focus:border-amber-500"
                    />
                    <input 
                      type="date"
                      value={ev.inputDate}
                      onChange={(e) => handleRowChange(i, 'inputDate', e.target.value)}
                      className="bg-transparent text-slate-400 text-xs w-[105px] outline-none [&::-webkit-calendar-picker-indicator]:invert"
                    />
                    <select 
                      value={ev.priority}
                      onChange={(e) => handleRowChange(i, 'priority', parseInt(e.target.value))}
                      className="bg-[#1F2937] text-white text-[10px] font-bold rounded px-2 py-1 outline-none appearance-none"
                    >
                      <option value="4">P4</option>
                      <option value="3">P3</option>
                      <option value="2">P2</option>
                      <option value="1">P1</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-slate-400 text-sm text-center mb-4">{selectedCount} of {extractedEvents.length} selected</p>
              <button 
                onClick={handleBulkSubmit}
                disabled={isSubmitting || selectedCount === 0}
                className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl mb-3 flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Import Selected'}
              </button>
              <button 
                onClick={() => setMode('upload')}
                disabled={isSubmitting}
                className="w-full py-3 text-slate-400 font-semibold hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* SUCCESS STATE */}
        {mode === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex flex-col items-center justify-center mt-20"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="mb-6 relative"
            >
              <div className="absolute inset-0 bg-green-500/20 blur-[40px] rounded-full" />
              <CheckCircle2 className="w-20 h-20 text-green-500 relative z-10" />
            </motion.div>
            
            <h2 className="text-white text-[22px] font-bold mb-2">{selectedCount} events added!</h2>
            
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-amber-500 font-semibold mt-4 flex items-center gap-1 hover:text-amber-400"
            >
              View your schedule →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  )
}
