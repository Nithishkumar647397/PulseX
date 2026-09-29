'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Activity, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isFormValid = fullName.trim() && isValidEmail(email) && password.length >= 6

  const calculateStrength = (p: string) => {
    let score = 0
    if (p.length > 5) score += 1
    if (p.length > 8) score += 1
    if (/[A-Z]/.test(p)) score += 1
    if (/[0-9]/.test(p)) score += 1
    if (/[^A-Za-z0-9]/.test(p)) score += 1
    return score
  }
  const strength = calculateStrength(password)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, timezone },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (signUpError) {
        setError(signUpError.message || 'An error occurred during sign up.')
        return
      }

      setSuccessMessage('Check your email for the confirmation link!')
    } catch (err) {
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[480px] card-pulse">
        
        {/* Header section */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-accent-amber text-black p-3 rounded-xl mb-6 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Create an account</h1>
          <p className="text-text-muted text-center">Join PulseX to master your schedule.</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-3 bg-danger-red/10 border border-danger-red/30 text-danger-red text-sm rounded-xl text-center font-medium">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-3 bg-success-green/10 border border-success-green/30 text-success-green text-sm rounded-xl text-center font-medium">
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="input-pulse"
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-pulse"
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 chars)"
                className="input-pulse pr-12"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary focus:outline-none"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {/* Strength Meter */}
            {password.length > 0 && (
              <div className="mt-2 flex gap-1 h-1.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${strength >= i ? (strength > 3 ? 'bg-success-green' : strength > 2 ? 'bg-accent-amber' : 'bg-danger-red') : 'bg-border'}`}></div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="input-pulse"
              disabled={loading}
            >
              <option value={timezone}>{timezone} (Detected)</option>
              {/* Could add a full list of timezones here later */}
            </select>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="btn-primary w-full mt-6"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
            {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface text-text-muted">OR</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn-ghost w-full"
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-amber font-semibold hover:underline">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
