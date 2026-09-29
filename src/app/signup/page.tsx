'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Activity, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const isFormValid = 
    email.trim() !== '' && 
    isValidEmail(email) && 
    password.trim() !== '' && 
    password === confirmPassword && 
    password.length >= 6

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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('fetch')) {
          setError('Network error. Please try again.')
        } else {
          setError(signUpError.message || 'An error occurred during sign up.')
        }
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8">
        
        {/* Header section */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-black text-white p-3 rounded-xl mb-6">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create an account</h1>
          <p className="text-gray-500 text-center">Join PulseX to master your schedule.</p>
        </div>

        {/* Marketing / Info Card */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 mb-8">
          <p className="text-[10px] font-bold text-blue-800 tracking-wider mb-4">
            REMINDERS THAT INCREASE WITH URGENCY.
          </p>
          
          <div className="relative mb-6 mt-2">
            {/* Background track */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-gray-200 rounded-full"></div>
            {/* Gradient progress */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-200 to-blue-600 rounded-full"></div>
            
            {/* Dots and Labels */}
            <div className="relative flex justify-between items-center text-[10px] font-medium">
              <div className="flex flex-col items-center gap-2 -ml-3">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300 z-10 border-2 border-white shadow-sm"></div>
                <span className="text-gray-400 mt-1">7 DAYS</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300 z-10 border-2 border-white shadow-sm"></div>
                <span className="text-gray-400 mt-1">3 DAYS</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300 z-10 border-2 border-white shadow-sm"></div>
                <span className="text-gray-400 mt-1">1 DAY</span>
              </div>
              <div className="flex flex-col items-center gap-2 -mr-3">
                <div className="w-3.5 h-3.5 rounded-full bg-blue-600 z-10 border-2 border-white shadow-md ring-4 ring-blue-100"></div>
                <span className="text-blue-600 font-bold mt-1">TODAY</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg text-center">
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all placeholder:text-gray-400"
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 chars)"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all placeholder:text-gray-400 pr-12"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all placeholder:text-gray-400 pr-12"
                disabled={loading}
              />
            </div>
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-900 text-white py-3.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">OR</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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

        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-black font-semibold hover:underline">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
