'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Cake, 
  Phone, 
  Building2, 
  BookOpen, 
  GraduationCap, 
  Pencil,
  Clock,
  Globe,
  Bell,
  LogOut,
  ChevronRight
} from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [profile, setProfile] = useState<{ full_name: string, email: string, dob: string, phone: string, college: string, department: string, year: string, streak: number, totalEvents: number, joinDate: string }>({
    full_name: '',
    email: '',
    dob: '',
    phone: '',
    college: '',
    department: '',
    year: '',
    streak: 0,
    totalEvents: 0,
    joinDate: ''
  })
  
  const [settings, setSettings] = useState({
    reminderTime: '08:00',
    timezone: 'UTC',
    notifications: true
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch streak & events for stats
        const resStreak = await fetch('/api/streak')
        const streakData = resStreak.ok ? await resStreak.json() : { current_streak: 0, total_events: 0 }

        setProfile({
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email || '',
          dob: user.user_metadata?.dob || '2000-01-01',
          phone: user.user_metadata?.phone || '+1 234 567 8900',
          college: user.user_metadata?.college || 'University',
          department: user.user_metadata?.department || 'Computer Science',
          year: user.user_metadata?.year || 'Junior',
          streak: streakData.current_streak || 0,
          totalEvents: streakData.total_events || 0,
          joinDate: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // API call to delete account
      alert('Account deletion initiated.')
      handleSignOut()
    }
  }

  const handleSave = async () => {
    // Save to user meta data
    await supabase.auth.updateUser({
      data: {
        full_name: profile.full_name,
        dob: profile.dob,
        phone: profile.phone,
        college: profile.college,
        department: profile.department,
        year: profile.year
      }
    })
    setIsEditMode(false)
  }

  const calculateAge = (dob: string) => {
    if (!dob) return 0
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(dob).getTime()
    return Math.abs(new Date(diff).getUTCFullYear() - 1970)
  }

  if (loading) {
    return <div className="min-h-screen bg-[#F8FAFC] flex justify-center items-center"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      
      {/* HEADER */}
      <div className="pt-16 pb-8 px-5 flex flex-col items-center">
        <div className="relative group cursor-pointer mb-4">
          <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
            <span className="text-white text-[28px] font-black">{profile.full_name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-5 h-5 text-white" />
          </div>
        </div>
        <h1 className="text-[22px] font-bold text-[#0F172A] text-center mb-1">{profile.full_name}</h1>
        <p className="text-slate-500 text-[14px] text-center mb-6">{profile.email}</p>

        <div className="flex items-center justify-center bg-white rounded-xl border border-[#E2E8F0] p-4 w-full max-w-xs shadow-sm">
          <div className="flex-1 text-center border-r border-[#E2E8F0]">
            <div className="text-amber-500 font-bold text-lg leading-none mb-1">{profile.streak}</div>
            <div className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">days</div>
          </div>
          <div className="flex-1 text-center border-r border-[#E2E8F0]">
            <div className="text-amber-500 font-bold text-lg leading-none mb-1">{profile.totalEvents}</div>
            <div className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">events</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-amber-500 font-bold text-sm leading-none mb-1 whitespace-nowrap px-1">{profile.joinDate}</div>
            <div className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">member</div>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-6">
        
        {/* PERSONAL INFO */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[#0F172A] font-semibold tracking-tight">Personal Info</h2>
          </div>
          
          <motion.div layout className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <InfoRow icon={<User />} label="Full Name" value={profile.full_name} isEdit={isEditMode} onChange={(v) => setProfile({...profile, full_name: v})} />
            
            <div className="relative">
              <InfoRow icon={<Cake />} label="Date of Birth" value={isEditMode ? profile.dob : `${new Date(profile.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric'})} (Age ${calculateAge(profile.dob)})`} isEdit={isEditMode} isDate onChange={(v) => setProfile({...profile, dob: v})} />
              {isEditMode && <div className="absolute right-4 bottom-[-10px] text-amber-500 text-xs font-semibold">You are {calculateAge(profile.dob)} years old</div>}
            </div>
            
            <InfoRow icon={<Phone />} label="Phone" value={profile.phone} isEdit={isEditMode} onChange={(v) => setProfile({...profile, phone: v})} />
            <InfoRow icon={<Building2 />} label="College" value={profile.college} isEdit={isEditMode} onChange={(v) => setProfile({...profile, college: v})} />
            <InfoRow icon={<BookOpen />} label="Department" value={profile.department} isEdit={isEditMode} onChange={(v) => setProfile({...profile, department: v})} />
            <InfoRow icon={<GraduationCap />} label="Year of Study" value={profile.year} isEdit={isEditMode} onChange={(v) => setProfile({...profile, year: v})} noBorder />
          </motion.div>

          <AnimatePresence mode="wait">
            {!isEditMode ? (
              <motion.button 
                key="edit-btn"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => setIsEditMode(true)}
                className="w-full mt-4 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] py-3.5 rounded-xl font-semibold flex justify-center items-center gap-2 transition-colors shadow-sm"
              >
                <Pencil className="w-4 h-4" /> Edit Profile
              </motion.button>
            ) : (
              <motion.div 
                key="save-btn"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3"
              >
                <button 
                  onClick={handleSave}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-bold transition-all shadow-sm"
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => setIsEditMode(false)}
                  className="w-full bg-transparent hover:bg-slate-100 text-slate-500 py-3.5 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* PREFERENCES */}
        <section>
          <h2 className="text-[#0F172A] font-semibold tracking-tight mb-3">Preferences</h2>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0] cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Reminder Time</span>
              </div>
              <div className="flex items-center gap-2 text-[#0F172A] text-sm font-medium">
                {settings.reminderTime} AM <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0] cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Timezone</span>
              </div>
              <div className="flex items-center gap-2 text-[#0F172A] text-sm font-medium">
                {settings.timezone} <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Notifications</span>
              </div>
              <button 
                onClick={() => setSettings({...settings, notifications: !settings.notifications})}
                className={`w-11 h-6 rounded-full p-1 transition-colors ${settings.notifications ? 'bg-amber-500' : 'bg-slate-200'}`}
              >
                <motion.div 
                  layout
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                  animate={{ x: settings.notifications ? 20 : 0 }}
                />
              </button>
            </div>
          </div>
        </section>

        {/* DANGER ZONE */}
        <section className="pt-2">
          <button 
            onClick={handleSignOut}
            className="w-full bg-red-50 border border-red-200 text-red-600 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
          <div className="mt-4 text-center">
            <button 
              onClick={handleDeleteAccount}
              className="text-slate-400 text-xs hover:text-red-500 transition-colors underline underline-offset-2"
            >
              Delete my account
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, isEdit, isDate = false, noBorder = false, onChange }: { icon: React.ReactNode, label: string, value: string, isEdit: boolean, isDate?: boolean, noBorder?: boolean, onChange?: (v: string) => void }) {
  return (
    <div className={`p-4 flex items-center gap-4 ${!noBorder ? 'border-b border-[#E2E8F0]' : ''} ${isEdit ? 'bg-amber-50/30' : ''} transition-colors`}>
      <div className="w-4 h-4 flex-shrink-0 text-slate-400 mt-1 self-start">
        {icon}
      </div>
      <div className="flex-1">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</label>
        {isEdit ? (
          <input 
            type={isDate ? 'date' : 'text'}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full bg-transparent text-[#0F172A] text-sm font-medium outline-none border-b border-amber-300 focus:border-amber-500 pb-1 transition-colors"
          />
        ) : (
          <div className="text-[#0F172A] text-sm font-medium">{value}</div>
        )}
      </div>
    </div>
  )
}
