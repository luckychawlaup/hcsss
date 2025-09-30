
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  console.log('Auth callback params:', { 
    token_hash: !!token_hash, 
    code: !!code,
    type, 
    url: requestUrl.toString() 
  })

  // For password recovery with token_hash, redirect to a client-side page
  // Pass the parameters via hash fragment to preserve them
  if (token_hash && type === 'recovery') {
    console.log('Password recovery detected - redirecting with hash fragment')
    
    // Use hash fragment to pass the token and type to the client
    const redirectUrl = `${requestUrl.origin}/auth/update-password#token_hash=${token_hash}&type=${type}`
    console.log('Redirecting to:', redirectUrl)
    
    return NextResponse.redirect(redirectUrl)
  }

  // Handle email confirmation or other auth callbacks with code
  if (code) {
    console.log('Code-based auth detected')
    
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
              // Ignore
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Ignore
            }
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log('Successfully exchanged code for session')
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    } else {
      console.error("Error exchanging code:", error.message)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(error.message || 'Invalid link.')}`
      )
    }
  }

  // No valid parameters found
  console.error('No valid auth parameters found in callback URL')
  return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid link. Please try again.`)
}
