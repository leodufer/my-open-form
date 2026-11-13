import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'
import { getInternalSupabaseFetch } from './internal-fetch'

/**
 * Creates a server-only Supabase admin client using the service role key.
 * Never import this file from client components.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL environment variable.'
    )
  }

  const internalFetch = getInternalSupabaseFetch(
    supabaseUrl,
    process.env.SUPABASE_INTERNAL_URL
  )

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    ...(internalFetch ? { global: { fetch: internalFetch } } : {}),
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

