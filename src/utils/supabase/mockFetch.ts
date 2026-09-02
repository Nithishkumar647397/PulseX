export const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = input.toString()
  
  // Only intercept requests to the dummy project
  if (url.includes('dummy-project.supabase.co')) {
    
    // Auth endpoints
    if (url.includes('/auth/v1/signup')) {
      return new Response(JSON.stringify({
        id: "mock-user-123",
        email: "test@example.com",
        role: "authenticated",
        aud: "authenticated",
        created_at: new Date().toISOString()
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    
    if (url.includes('/auth/v1/token')) {
       return new Response(JSON.stringify({
        access_token: "mock-token-xyz",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-xyz",
        user: { 
          id: "mock-user-123", 
          email: "test@example.com", 
          role: "authenticated",
          aud: "authenticated",
          app_metadata: {},
          user_metadata: { full_name: "Mock User" },
          created_at: new Date().toISOString()
        }
       }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    
    if (url.includes('/auth/v1/user')) {
       return new Response(JSON.stringify({
        id: "mock-user-123", 
        email: "test@example.com",
        role: "authenticated",
        aud: "authenticated",
        app_metadata: {},
        user_metadata: { full_name: "Mock User" },
        created_at: new Date().toISOString()
       }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Database REST endpoints
    if (url.includes('/rest/v1/events')) {
       if (init?.method === 'GET') {
          return new Response(JSON.stringify([
            {
              id: "mock-event-1",
              title: "Mock Interview Prep",
              event_date: new Date().toISOString(),
              category: "Meeting",
              priority: 3,
              completed: false,
              user_id: "mock-user-123"
            }
          ]), { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' } })
       }
       return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    
    if (url.includes('/rest/v1/streaks')) {
       return new Response(JSON.stringify([
         { current_streak: 5 }
       ]), { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' } })
    }
    
    if (url.includes('/rest/v1/conflicts') || url.includes('/rest/v1/profiles') || url.includes('/rest/v1/sent_log')) {
       return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' } })
    }
    
    // Default fallback for any other dummy requests
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  
  // Real fetch for everything else
  return fetch(input, init)
}
