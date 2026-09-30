'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isFormValid = fullName.trim() !== '' && email.trim() !== '' && isValidEmail(email) && password.length >= 6

  // Basic password strength logic
  let strengthScore = 0
  if (password.length > 5) strengthScore += 1
  if (password.length > 8) strengthScore += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strengthScore += 1
  if (/[0-9!@#$%^&*]/.test(password)) strengthScore += 1

  const strengthLabel = ['Weak', 'Fair', 'Good', 'Strong'][Math.max(0, strengthScore - 1)]

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setLoading(true)
    setError(null)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (authError) {
      setError('Could not connect to Google.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      
      {/* Top Section */}
      <div className="flex-none pt-16 pb-8 flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-[#F8FAFC]">
        <h1 className="text-4xl font-black text-amber-500 tracking-tighter mb-2">PulseX</h1>
        <p className="text-slate-500 text-sm">Create your account to get started.</p>
      </div>

      {/* Bottom Section */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10 border-t border-[#E2E8F0] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-white border border-[#E2E8F0] focus:border-amber-400 focus:ring-2 focus:ring-amber-100 rounded-xl py-3.5 px-4 text-[#0F172A] outline-none transition-all placeholder:text-slate-400 shadow-sm"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white border border-[#E2E8F0] focus:border-amber-400 focus:ring-2 focus:ring-amber-100 rounded-xl py-3.5 px-4 text-[#0F172A] outline-none transition-all placeholder:text-slate-400 shadow-sm"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full bg-white border border-[#E2E8F0] focus:border-amber-400 focus:ring-2 focus:ring-amber-100 rounded-xl py-3.5 px-4 pr-12 text-[#0F172A] outline-none transition-all placeholder:text-slate-400 shadow-sm"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Strength Bar */}
            {password.length > 0 && (
              <div className="mt-3">
                <div className="flex gap-1 h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden mb-2">
                  {[1, 2, 3, 4].map(level => (
                    <div 
                      key={level} 
                      className={`flex-1 transition-all duration-300 ${strengthScore >= level ? 'bg-amber-500' : 'bg-transparent'}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-right font-medium text-slate-500 uppercase tracking-widest">
                  {strengthLabel}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 hover:bg-amber-600 active:scale-[0.98] mt-4 shadow-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E2E8F0]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-slate-400">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-[#E2E8F0] text-[#0F172A] py-3.5 rounded-xl font-bold transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-amber-500 font-bold hover:text-amber-600 transition-colors">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
