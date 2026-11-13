import { SupabaseClient, User } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

export const ADMIN_EMAIL = 'leodufer@gmail.com'
export type UserRole = 'admin' | 'user'

export function isPrimaryAdminEmail(email: string | undefined | null): boolean {
  return (email || '').trim().toLowerCase() === ADMIN_EMAIL
}

export async function getUserRole(
  supabase: SupabaseClient<Database>,
  user: Pick<User, 'id' | 'email'>
): Promise<UserRole> {
  if (isPrimaryAdminEmail(user.email)) {
    return 'admin'
  }

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = data as { role?: string } | null
  return profile?.role === 'admin' ? 'admin' : 'user'
}

export async function isAdminUser(
  supabase: SupabaseClient<Database>,
  user: Pick<User, 'id' | 'email'>
): Promise<boolean> {
  return (await getUserRole(supabase, user)) === 'admin'
}

