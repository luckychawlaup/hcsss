
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

  console.log('=== AUTH CALLBACK DEBUG ===')
  console.log('Full URL:', request.url)
  console.log('Code present:', !!code)
  console.log('Next param:', next)
  console.log('Error param:', error)
  console.log('Error description:', errorDescription)

  // If there's already an error from Supabase, redirect immediately
  if (error) {
    console.log('ERROR: Supabase returned error before code exchange')
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
    
    console.log('Attempting to exchange code for session...')
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    console.log('Exchange result - Success:', !!data.session)
    console.log('Exchange result - Error:', exchangeError?.message)
    console.log('Exchange result - User:', data.user?.email)


    if (exchangeError) {
      console.log('ERROR during code exchange:', exchangeError)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/confirm?error=exchange_failed&error_description=${exchangeError.message}`
      )
    }

    // Determine if this is an email confirmation or regular login
    const isEmailConfirmation = !requestUrl.searchParams.has('next')

    if (isEmailConfirmation) {
        console.log('Email confirmation flow - redirecting to /auth/confirm')
        return NextResponse.redirect(`${requestUrl.origin}/auth/confirm`)
    } else {
        console.log('Regular login/redirect flow - redirecting to:', next)
        return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // Fallback redirect
  console.log('No code found, redirecting to login with an error.')
  return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error`);
}
