'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { 
  Home, 
  CalendarDays, 
  Zap, 
  User as UserIcon,
  Settings,
  LogOut,
  Edit2,
  Save,
  X,
  Phone,
  GraduationCap,
  Building2,
  Clock,
  Calendar
} from 'lucide-react'

type UserProfile = {
  id: string
  full_name: string
  email: string
  date_of_birth: string | null
  phone: string | null
  college: string | null
  department: string | null
  year_of_study: string | null
  timezone: string | null
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        
      if (data) {
        const fullData = { ...data, email: user.email }
        setProfile(fullData)
        setEditForm(fullData)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSave = async () => {
    if (!profile) return
    setIsSaving(true)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          date_of_birth: editForm.date_of_birth,
          phone: editForm.phone,
          college: editForm.college,
          department: editForm.department,
          year_of_study: editForm.year_of_study,
          timezone: editForm.timezone
        })
        .eq('id', profile.id)
        
      if (error) throw error
      
      setProfile({ ...profile, ...editForm } as UserProfile)
      setIsEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 animate-pulse">
        <div className="flex flex-col items-center mt-10">
          <div className="w-24 h-24 bg-surface rounded-full mb-4"></div>
          <div className="w-48 h-8 bg-surface rounded mb-2"></div>
          <div className="w-32 h-4 bg-surface rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-text-primary">
      <header className="px-6 py-6 border-b border-border flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <button onClick={handleSignOut} className="text-danger-red p-2 hover:bg-danger-red/10 rounded-full transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="p-5 max-w-[480px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mt-4 mb-8">
          <div className="w-20 h-20 bg-accent-amber rounded-full flex items-center justify-center text-3xl font-black text-background mb-4 shadow-lg shadow-accent-amber/20">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {isEditing ? (
            <input 
              type="text" 
              value={editForm.full_name || ''} 
              onChange={e => setEditForm({...editForm, full_name: e.target.value})}
              className="bg-surface border border-border rounded-lg px-4 py-2 text-white font-bold text-center w-full max-w-[250px] focus:border-accent-amber outline-none"
            />
          ) : (
            <h2 className="text-2xl font-bold text-white mb-1">{profile?.full_name}</h2>
          )}
          <p className="text-sm text-text-muted">{profile?.email}</p>
        </div>

        {/* Edit Toggle */}
        <div className="flex justify-end mb-4">
          {isEditing ? (
            <div className="flex gap-2">
              <button 
                onClick={() => { setIsEditing(false); setEditForm(profile || {}) }}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
              >
                {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save</>}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Details Section */}
        <div className="card-pulse p-1 divide-y divide-border">
          
          <div className="p-4 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone
            </label>
            {isEditing ? (
              <input 
                type="tel" 
                value={editForm.phone || ''} 
                onChange={e => setEditForm({...editForm, phone: e.target.value})}
                className="bg-background border border-border rounded p-2 text-white text-sm focus:border-accent-amber outline-none"
                placeholder="+1 234 567 8900"
              />
            ) : (
              <p className="text-sm font-semibold text-white">{profile?.phone || 'Not provided'}</p>
            )}
          </div>

          <div className="p-4 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date of Birth
            </label>
            {isEditing ? (
              <input 
                type="date" 
                value={editForm.date_of_birth || ''} 
                onChange={e => setEditForm({...editForm, date_of_birth: e.target.value})}
                className="bg-background border border-border rounded p-2 text-white text-sm focus:border-accent-amber outline-none"
              />
            ) : (
              <p className="text-sm font-semibold text-white">
                {profile?.date_of_birth 
                  ? new Date(profile.date_of_birth).toLocaleDateString() 
                  : 'Not provided'}
              </p>
            )}
          </div>

          <div className="p-4 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> College / University
            </label>
            {isEditing ? (
              <input 
                type="text" 
                value={editForm.college || ''} 
                onChange={e => setEditForm({...editForm, college: e.target.value})}
                className="bg-background border border-border rounded p-2 text-white text-sm focus:border-accent-amber outline-none"
                placeholder="e.g. Stanford University"
              />
            ) : (
              <p className="text-sm font-semibold text-white">{profile?.college || 'Not provided'}</p>
            )}
          </div>

          <div className="p-4 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Department
            </label>
            {isEditing ? (
              <input 
                type="text" 
                value={editForm.department || ''} 
                onChange={e => setEditForm({...editForm, department: e.target.value})}
                className="bg-background border border-border rounded p-2 text-white text-sm focus:border-accent-amber outline-none"
                placeholder="e.g. Computer Science"
              />
            ) : (
              <p className="text-sm font-semibold text-white">{profile?.department || 'Not provided'}</p>
            )}
          </div>

          <div className="p-4 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3 h-3" /> Timezone
            </label>
            {isEditing ? (
              <select 
                value={editForm.timezone || ''} 
                onChange={e => setEditForm({...editForm, timezone: e.target.value})}
                className="bg-background border border-border rounded p-2 text-white text-sm focus:border-accent-amber outline-none"
              >
                <option value="">Select Timezone</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Asia/Kolkata">India (IST)</option>
              </select>
            ) : (
              <p className="text-sm font-semibold text-white">{profile?.timezone || 'Not provided'}</p>
            )}
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
          <Link href="/streak" className="flex flex-col items-center gap-1 text-text-muted hover:text-white transition-colors">
            <Zap className="w-6 h-6" />
            <span className="text-[10px] font-medium">Streak</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-accent-amber relative">
            <UserIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold">Profile</span>
            <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-accent-amber"></div>
          </Link>
        </div>
      </nav>
    </div>
  )
}
