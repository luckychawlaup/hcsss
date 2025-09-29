
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const type = requestUrl.searchParams.get('type');

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    // This is the crucial step: exchange the code for a session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      // For password recovery, redirect to the update password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${requestUrl.origin}/auth/update-password`);
      }
      // For other flows (login, email confirmation), redirect to the intended page or dashboard
      return NextResponse.redirect(`${requestUrl.origin}${next || '/'}`)
    }
  }

  // Fallback redirect if there's an error or no code
  console.error("Password reset callback error or no code provided.");
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
