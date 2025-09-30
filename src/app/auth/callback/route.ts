
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code && type === 'recovery') {
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
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    // Supabase password recovery uses exchangeCodeForSession with the token_hash
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // On success, redirect to the update-password page.
      // The session is now stored in the cookies.
      return NextResponse.redirect(`${requestUrl.origin}/auth/update-password`)
    } else {
        console.error("Error exchanging code for session:", error.message);
        // This is the error the user is seeing.
        return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid or expired recovery link.`);
    }
  }

  // Handle other auth callbacks like email confirmation if code is present but not for recovery
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
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
     if (!error) {
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }


  // return the user to an error page with instructions
  return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid link. Please try again.`)
}
