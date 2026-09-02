import { createBrowserClient } from '@supabase/ssr'
import { mockFetch } from './mockFetch'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: mockFetch,
      },
    }
  )
}
