
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

  // This is a password recovery flow. The user has a recovery token in the URL.
  // Supabase JS will handle this token and create a session for password update.
  if (type === 'recovery') {
      // The user is coming from an email link. The URL has a token that the client-side
      // Supabase library needs to read to establish a "PASSWORD_RECOVERY" session.
      // Redirecting to the update-password page allows the client-side code there to
      // pick up the session change.
      return NextResponse.redirect(`${requestUrl.origin}/auth/update-password`);
  }

  // This is a regular login or email confirmation flow
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/confirm?error=exchange_failed&error_description=${exchangeError.message}`
      )
    }
  }

  // Determine where to redirect next
  const isEmailConfirmation = !requestUrl.searchParams.has('next')
  if (isEmailConfirmation) {
    return NextResponse.redirect(`${requestUrl.origin}/auth/confirm`)
  } else {
    // Regular login flow (e.g., student, teacher)
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  }
}
