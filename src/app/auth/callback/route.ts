
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const type = requestUrl.searchParams.get('type');

  // If Supabase redirects with an error, show it
  if (error) {
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/confirm?error=${error}&error_description=${errorDescription}`
    )
  }
  
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
    
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/confirm?error=exchange_failed&error_description=${exchangeError.message}`
      )
    }

    // This is a password recovery flow.
    // The user has clicked a link in their email. Supabase has verified it and sent us here with a session.
    // We now redirect to the update-password page where the user can enter their new password.
    if (type === 'recovery' && session) {
        return NextResponse.redirect(`${requestUrl.origin}/auth/update-password`);
    }

    // Determine where to redirect next for other flows
    const isEmailConfirmation = !requestUrl.searchParams.has('next')
    if (isEmailConfirmation) {
      return NextResponse.redirect(`${requestUrl.origin}/auth/confirm`)
    } else {
      // Regular login flow (e.g., student, teacher)
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // Fallback for cases without a code, like initial password recovery click
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
