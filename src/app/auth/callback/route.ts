
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

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
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    // Check if the session is for a new user who just confirmed their email
    // The user object will exist, but the session might be null initially
    // or they might have an "aal" (Authenticator Assurance Level) of 1.
    // A more reliable way is to check if there was a previous session.
    // However, for admin creation, they are immediately sent a password reset.
    // The intended flow is they click the password reset, not the initial confirm.
    // But if they click the confirm, we should guide them.
    // A new user confirming their email will trigger a "SIGNED_IN" event, but will still need to set a password.
    // The most reliable redirect after any code exchange is to where they can take the next action.
    
    if (!error) {
       // If the user is confirming their email for the first time as an admin,
       // they still need to set their password. Redirect them to the update-password page.
       // The session from the code exchange will authorize them to perform this action.
      if (next === '/') { // Default case, likely an email confirmation
        return NextResponse.redirect(`${origin}/auth/update-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
