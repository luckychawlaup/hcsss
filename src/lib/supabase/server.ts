import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const createClient = () =>
  createPagesServerClient({
    cookies,
  })
