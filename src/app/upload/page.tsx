'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  FileIcon,
  CheckCircle2,
  AlertTriangle,
  Home,
  CalendarDays,
  Zap,
  User,
  X
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
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<'upload' | 'preview'>('upload')
  const [isUploading, setIsUploading] = useState(false)
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([])
  const [uploadError, setUploadError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

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
      
      const events: ExtractedEvent[] = data.events.map((ev: any) => {
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
    } catch (err: any) {
      setUploadError(err.message)
      showToast('Extraction failed. Please try again.', 'error')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRowChange = (index: number, field: keyof ExtractedEvent, value: any) => {
    const updated = [...extractedEvents]
    updated[index] = { ...updated[index], [field]: value }
    setExtractedEvents(updated)
  }

  const handleBulkSubmit = async () => {
    const selectedEvents = extractedEvents.filter(e => e.selected)
    if (selectedEvents.length === 0 || isSubmitting) return
    setIsSubmitting(true)

    try {
      // Run sequentially to avoid rate limits
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
      showToast(`${selectedEvents.length} events added to your schedule!`, 'success')
      // Short delay so user can see toast before redirect
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err) {
      console.error(err)
      showToast('Import failed. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPriorityDetails = (p: number) => {
    if (p >= 4) return { label: 'EXAM', class: 'chip-exam' }
    if (p === 3) return { label: 'HIGH', class: 'chip-high' }
    if (p === 2) return { label: 'MEDIUM', class: 'chip-medium' }
    return { label: 'LOW', class: 'chip-low' }
  }

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-text-primary">
      <header className="sticky top-0 bg-background/90 backdrop-blur-md z-10 px-6 py-4 flex items-center gap-4 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight text-white">Import Schedule</h1>
      </header>

      <main className="p-5 max-w-[480px] mx-auto">
        {mode === 'upload' && (
          <div className="card-pulse flex flex-col items-center justify-center p-8 mt-6">
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
              className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
                isUploading ? 'border-accent-amber/50 bg-accent-amber/5' : 'border-border hover:border-accent-amber/50 bg-surface'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-12 h-12 border-4 border-accent-amber border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-lg font-bold text-white mb-2">Reading your file...</h3>
                  <p className="text-sm text-text-muted text-center">Our AI is extracting your schedule.</p>
                </>
              ) : (
                <>
                  <div className="flex gap-3 mb-6">
                    <FileIcon className="w-10 h-10 text-danger-red opacity-80" />
                    <FileText className="w-10 h-10 text-blue-500 opacity-80" />
                    <FileSpreadsheet className="w-10 h-10 text-success-green opacity-80" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Upload File</h3>
                  <p className="text-sm text-text-muted text-center mb-6">
                    We support PDF, Word, Excel, and CSV files.
                  </p>
                  <div className="btn-primary w-full">
                    Select File
                  </div>
                </>
              )}
            </label>
            
            {uploadError && (
              <div className="mt-4 p-3 bg-danger-red/10 border border-danger-red/30 rounded-xl flex items-center gap-2 text-danger-red w-full">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {mode === 'preview' && (
          <div className="space-y-6 mt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Found {extractedEvents.length} events</h2>
                <p className="text-xs text-text-muted">Review and edit before saving</p>
              </div>
              <button 
                onClick={() => setMode('upload')}
                className="text-xs font-semibold text-accent-amber hover:underline"
              >
                Upload different file
              </button>
            </div>

            <div className="space-y-3">
              {extractedEvents.map((ev, i) => (
                <div key={ev.id} className={`card-pulse p-4 transition-all ${!ev.selected ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <input 
                      type="checkbox" 
                      checked={ev.selected}
                      onChange={(e) => handleRowChange(i, 'selected', e.target.checked)}
                      className="mt-1.5 w-4 h-4 rounded border-border bg-background text-accent-amber focus:ring-accent-amber"
                    />
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={ev.title}
                        onChange={(e) => handleRowChange(i, 'title', e.target.value)}
                        className="w-full font-semibold text-white bg-transparent border-b border-dashed border-border focus:border-accent-amber outline-none py-1"
                      />
                    </div>
                  </div>

                  <div className="pl-7 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-text-muted uppercase tracking-widest block mb-1">Date</label>
                      <input 
                        type="date"
                        value={ev.inputDate}
                        onChange={(e) => handleRowChange(i, 'inputDate', e.target.value)}
                        className="w-full text-xs font-medium bg-background border border-border text-white rounded p-1.5 outline-none focus:border-accent-amber"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-text-muted uppercase tracking-widest block mb-1">Priority</label>
                      <select 
                        value={ev.priority}
                        onChange={(e) => handleRowChange(i, 'priority', parseInt(e.target.value))}
                        className={`w-full text-xs font-bold bg-background border border-border rounded p-1.5 outline-none ${getPriorityDetails(ev.priority).class}`}
                      >
                        <option value="4" className="text-red-400">EXAM (4)</option>
                        <option value="3" className="text-orange-400">HIGH (3)</option>
                        <option value="2" className="text-blue-400">MED (2)</option>
                        <option value="1" className="text-slate-400">LOW (1)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleBulkSubmit}
              disabled={isSubmitting || !extractedEvents.some(e => e.selected)}
              className="btn-primary w-full sticky bottom-20 z-20 shadow-2xl"
            >
              {isSubmitting ? 'Importing...' : `Import ${extractedEvents.filter(e => e.selected).length} Events`}
            </button>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-xl font-semibold shadow-xl border flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-surface border-accent-amber text-white' : 'bg-danger-red text-white border-danger-red'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-accent-amber" /> : <AlertTriangle className="w-5 h-5" />}
            {toast.message}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border px-6 py-3 pb-safe z-30">
        <div className="max-w-[480px] mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-text-muted hover:text-white transition-colors">
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/upload" className="flex flex-col items-center gap-1 text-accent-amber relative">
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-bold">Add</span>
            <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-accent-amber"></div>
          </Link>
          <Link href="/streak" className="flex flex-col items-center gap-1 text-text-muted hover:text-white transition-colors">
            <Zap className="w-6 h-6" />
            <span className="text-[10px] font-medium">Streak</span>
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
