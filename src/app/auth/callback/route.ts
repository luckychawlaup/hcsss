import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')


  if (error) {
    console.error('❌ Supabase returned error:', error, error_description)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (!code) {
    console.error('❌ No authentication code provided')
    return NextResponse.redirect(`${requestUrl.origin}/login?error=missing_auth_code`)
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
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('❌ Session exchange error:', exchangeError.message)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }
    
    if (!data.session) {
      console.error('❌ No session returned after exchange')
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Failed to create session. Please try again.`)
    }

    const redirectTo = next && next !== '/' ? next : '/';
    console.log('✅ Redirecting to:', redirectTo)
    return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`)

  } catch (error) {
    console.error('❌ Unexpected error during token exchange:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=An unexpected error occurred. Please try again.`
    )
  }
}
