'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Calendar, Clock, Zap, CheckCircle2, PlusCircle, AlertTriangle, Upload, FileText, X, Trash2 } from 'lucide-react'

type PriorityClass = {
  priority: number
  keyword: string | null
}

export default function AddEventModal({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void
  onSuccess: () => void 
}) {
  const [mode, setMode] = useState<'manual' | 'upload'>('manual')

  // --- Manual Mode State ---
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [category, setCategory] = useState('')
  const [autoPriority, setAutoPriority] = useState<PriorityClass>({ priority: 1, keyword: null })
  const [manualPriority, setManualPriority] = useState<number | null>(null)
  const [showOverride, setShowOverride] = useState(false)
  
  // --- Upload Mode State ---
  const [isUploading, setIsUploading] = useState(false)
  const [extractedEvents, setExtractedEvents] = useState<any[]>([])
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Common State ---
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounced Classification for Manual
  useEffect(() => {
    if (mode !== 'manual' || !title.trim()) {
      if (!title.trim()) setAutoPriority({ priority: 1, keyword: null })
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/classify?title=${encodeURIComponent(title)}`)
        if (res.ok) {
          const data = await res.json()
          setAutoPriority(data)
          
          if (!category && data.keyword) {
            const kw = data.keyword.toLowerCase()
            if (['exam', 'viva', 'test'].includes(kw)) setCategory('Exam')
            else if (['assignment', 'deadline', 'submission'].includes(kw)) setCategory('Assignment')
            else if (['meeting', 'lecture', 'seminar'].includes(kw)) setCategory('Meeting')
          }
        }
      } catch (err) {
        console.error('Classification error', err)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [title, category, mode])

  const activePriority = manualPriority !== null ? manualPriority : autoPriority.priority

  const getPriorityDetails = (p: number) => {
    if (p >= 3) return { label: 'HIGH', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' }
    if (p === 2) return { label: 'MEDIUM', color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-500' }
    return { label: 'LOW', color: 'text-gray-600', bg: 'bg-gray-50', dot: 'bg-gray-500' }
  }

  const pDetails = getPriorityDetails(activePriority)

  const getReminderStages = (p: number) => {
    const stages = []
    if (p >= 4) stages.push({ id: '7d', label: '7 DAYS' })
    if (p >= 3) stages.push({ id: '3d', label: '3 DAYS' })
    if (p >= 2) stages.push({ id: '1d', label: '1 DAY' })
    stages.push({ id: '0d', label: 'TODAY' })
    return stages
  }

  const stages = getReminderStages(activePriority)

  // Validation Manual
  const isPastDate = date && new Date(`${date}T${time || '00:00'}`) < new Date()
  const isFormValid = title.trim() && date && time && category

  const handleManualSubmit = async () => {
    if (!isFormValid || isSubmitting) return
    setIsSubmitting(true)
    
    try {
      const event_date = new Date(`${date}T${time}`).toISOString()
      
      const payload: any = {
        title,
        event_date,
        category: category.toLowerCase(),
        priority: activePriority
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
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Upload Handlers ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to extract file')
      
      // format dates for input types
      const events = data.events.map((ev: any) => {
        const d = new Date(ev.event_date)
        const dateStr = d.toISOString().split('T')[0]
        return {
          ...ev,
          inputDate: dateStr,
          inputTime: '09:00' // default time
        }
      })

      setExtractedEvents(events)
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleExtractedChange = (index: number, field: string, value: any) => {
    const updated = [...extractedEvents]
    updated[index][field] = value
    setExtractedEvents(updated)
  }

  const removeExtracted = (index: number) => {
    const updated = [...extractedEvents]
    updated.splice(index, 1)
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
          category: ev.category.toLowerCase(),
          priority: parseInt(ev.priority)
        }

        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }
      onSuccess()
    } catch (err) {
      console.error(err)
      alert('Failed to save some events')
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto animate-in slide-in-from-bottom-full duration-300">
      <div className="max-w-md mx-auto min-h-screen bg-white pb-24">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-6 py-4 flex items-center gap-4 border-b border-gray-100">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Add to Schedule</h1>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-6">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'manual' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
            >
              Manual Entry
            </button>
            <button 
              onClick={() => setMode('upload')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'upload' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
            >
              <Upload className="w-4 h-4" /> AI Extract
            </button>
          </div>
        </div>

        {mode === 'manual' ? (
          <div className="p-6 space-y-8">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">What do you need to do?</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mathematics Exam"
                className="w-full text-xl font-medium border-0 border-b-2 border-gray-200 focus:border-black px-0 py-2 outline-none transition-colors placeholder:text-gray-300 placeholder:font-normal"
                autoFocus
              />
            </div>

            {/* Date & Time */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all font-medium text-gray-900"
                  />
                </div>
                {isPastDate && (
                  <div className="flex items-center gap-1 mt-2 text-yellow-600">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-xs font-medium">This date is in the past.</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all font-medium text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</label>
              <div className="relative">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all font-medium text-gray-900"
                >
                  <option value="" disabled>Select a category...</option>
                  <option value="Exam">🔴 Exam</option>
                  <option value="Assignment">🔵 Assignment</option>
                  <option value="Meeting">🟣 Meeting</option>
                  <option value="General">⚪ General</option>
                </select>
              </div>
            </div>

            {/* PulseX Priority Card */}
            <div className={`rounded-2xl border transition-colors ${pDetails.bg} border-${pDetails.color.split('-')[1]}-100 p-5`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className={`w-5 h-5 ${pDetails.color} fill-current`} />
                <h3 className={`text-sm font-bold tracking-wide ${pDetails.color}`}>
                  PULSEX PRIORITY: {pDetails.label}
                </h3>
              </div>
              
              <p className="text-sm text-gray-700 mb-3">
                {autoPriority.keyword 
                  ? <><span className="capitalize font-semibold">{autoPriority.keyword}</span> detected — reminder plan adjusted to ensure you are well prepared.</>
                  : 'Standard priority assigned. Reminder plan will follow a normal schedule.'}
              </p>

              {!showOverride ? (
                <button 
                  onClick={() => setShowOverride(true)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Override priority
                </button>
              ) : (
                <div className="mt-4 pt-4 border-t border-black/5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Manual Override</label>
                  <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                    {[1, 2, 3, 4].map(p => (
                      <button
                        key={p}
                        onClick={() => setManualPriority(p)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                          activePriority === p 
                            ? 'bg-black text-white shadow-sm' 
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {p === 1 ? 'LOW' : p === 2 ? 'MED' : p === 3 ? 'HIGH' : 'MAX'}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => { setManualPriority(null); setShowOverride(false) }}
                    className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-900"
                  >
                    Reset to Auto
                  </button>
                </div>
              )}
            </div>

            {/* Reminder Preview Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Reminder Preview</h3>
              
              <div className="relative mb-6">
                <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-0.5 bg-blue-100 z-0"></div>
                <div className="relative z-10 flex justify-between">
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex flex-col items-center bg-white px-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 bg-white" />
                      <span className="text-[10px] font-bold text-gray-500 mt-1">{stage.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">You'll be notified:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {stages.map(s => (
                    <li key={s.id}>
                      {s.id === '0d' ? 'Morning reminder on the day of the task' : `${s.label.toLowerCase().replace(' days', '-day')} reminder`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Submit */}
            <div className="pt-6">
              <button 
                onClick={handleManualSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-black hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-6 h-6" />
                {isSubmitting ? 'Adding Task...' : 'Add to Schedule'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            
            {extractedEvents.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50 transition-all hover:bg-gray-100">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".pdf,.docx,.xlsx,.csv"
                  onChange={handleFileUpload}
                  className="hidden" 
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                  <FileText className="w-12 h-12 text-blue-500 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Upload Timetable</h3>
                  <p className="text-sm text-gray-500 mb-4">We support PDF, Word, Excel, and CSV files.</p>
                  
                  {isUploading ? (
                    <div className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium text-sm animate-pulse">
                      Analyzing Document...
                    </div>
                  ) : (
                    <div className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium text-sm shadow-md hover:bg-blue-700 transition-colors">
                      Browse Files
                    </div>
                  )}
                </label>
                {uploadError && <p className="text-red-500 text-sm mt-4 font-medium">{uploadError}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">Extracted Events</h3>
                    <p className="text-xs text-gray-500">Review and edit before saving</p>
                  </div>
                  <button 
                    onClick={() => setExtractedEvents([])}
                    className="text-xs text-blue-600 font-semibold"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-3">
                  {extractedEvents.map((ev, index) => (
                    <div key={ev.id} className={`p-4 rounded-xl border transition-all ${ev.selected ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <input 
                          type="checkbox" 
                          checked={ev.selected}
                          onChange={(e) => handleExtractedChange(index, 'selected', e.target.checked)}
                          className="mt-1.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={ev.title}
                            onChange={(e) => handleExtractedChange(index, 'title', e.target.value)}
                            className="w-full font-semibold text-gray-900 border-b border-dashed border-gray-300 focus:border-blue-500 outline-none bg-transparent py-1"
                          />
                        </div>
                        <button onClick={() => removeExtracted(index)} className="p-1 text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="pl-7 grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-gray-400">Date</label>
                          <input 
                            type="date"
                            value={ev.inputDate}
                            onChange={(e) => handleExtractedChange(index, 'inputDate', e.target.value)}
                            className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded p-1.5 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-gray-400">Priority</label>
                          <select 
                            value={ev.priority}
                            onChange={(e) => handleExtractedChange(index, 'priority', e.target.value)}
                            className={`w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded p-1.5 outline-none ${getPriorityDetails(parseInt(ev.priority)).color}`}
                          >
                            <option value="4">Priority 4 (MAX)</option>
                            <option value="3">Priority 3 (HIGH)</option>
                            <option value="2">Priority 2 (MED)</option>
                            <option value="1">Priority 1 (LOW)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleBulkSubmit}
                    disabled={isSubmitting || !extractedEvents.some(e => e.selected)}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {isSubmitting ? 'Saving...' : `Save ${extractedEvents.filter(e => e.selected).length} Events`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
