import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('=== AUTH CALLBACK DEBUG START ===')
  console.log('Full URL:', request.url)
  console.log('Origin:', requestUrl.origin)
  console.log('Code:', code)
  console.log('Token Hash:', token_hash)
  console.log('Type:', type)
  console.log('Error:', error)
  console.log('Error Description:', error_description)

  // Handle errors from Supabase
  if (error) {
    console.error('❌ Supabase returned error:', error, error_description)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  // Handle the token (either code or token_hash)
  const authToken = code || token_hash

  if (!authToken) {
    console.error('❌ No authentication token provided')
    return NextResponse.redirect(`${requestUrl.origin}/login?error=missing_token`)
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
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.error('Error setting cookie:', error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options })
          } catch (error) {
            console.error('Error removing cookie:', error)
          }
        },
      },
    }
  )

  try {
    console.log('🔄 Attempting to exchange token for session...')
    console.log('Token preview:', authToken.substring(0, 20) + '...')
    
    // For password recovery with token_hash, we need to verify the OTP
    let session = null
    let exchangeError = null

    if (token_hash && type === 'recovery') {
      console.log('🔐 Using verifyOtp for password recovery...')
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      })
      session = data?.session
      exchangeError = error
    } else {
      console.log('🔄 Using exchangeCodeForSession...')
      const { data, error } = await supabase.auth.exchangeCodeForSession(authToken)
      session = data?.session
      exchangeError = error
    }

    if (exchangeError) {
      console.error('❌ Session exchange error:', exchangeError.message)
      console.error('Full error:', JSON.stringify(exchangeError, null, 2))
      
      // Check for specific error types
      if (exchangeError.message.includes('already been used')) {
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=Link has already been used. Please request a new password reset.`
        )
      }
      
      if (exchangeError.message.includes('expired')) {
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=Link has expired. Please request a new password reset.`
        )
      }

      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    if (!session) {
      console.error('❌ No session returned after exchange')
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Failed to create session. Please try again.`)
    }

    console.log('✅ Session created successfully!')
    console.log('User ID:', session.user?.id)
    console.log('User Email:', session.user?.email)
    console.log('Session expires at:', new Date(session.expires_at! * 1000).toISOString())

    // CRITICAL: For password recovery, redirect to update-password page
    if (type === 'recovery') {
      console.log('🔐 Recovery flow detected - redirecting to update-password')
      
      // Create response with redirect
      const response = NextResponse.redirect(`${requestUrl.origin}/auth/update-password`)
      
      console.log('✅ Redirecting to /auth/update-password')
      return response
    }

    // Email confirmation or other auth flows
    const redirectTo = next && next !== '/' ? next : '/dashboard'
    console.log('✅ Redirecting to:', redirectTo)
    return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`)

  } catch (error) {
    console.error('❌ Unexpected error during token exchange:')
    console.error(error)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=An unexpected error occurred. Please try again.`
    )
  } finally {
    console.log('=== AUTH CALLBACK DEBUG END ===\n')
  }
}