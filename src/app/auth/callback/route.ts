import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // The 'next' param is used for redirects after login.
  // For email confirmations, we want to go to our confirmation page.
  const next = searchParams.get('next')

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
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If 'next' is present, it's a login redirect.
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      
      // If 'next' is NOT present, it's an email confirmation (signup, email change, etc.)
      // Redirect to the dedicated confirmation page.
      return NextResponse.redirect(`${origin}/auth/confirm`)
    }
  }

  // If there's an error or no code, redirect to an error page.
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
