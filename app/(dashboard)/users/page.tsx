import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminUser, isPrimaryAdminEmail, UserRole } from '@/lib/auth/roles'
import { ManagedUser } from '@/app/api/admin/users/route'
import { UsersManager } from '@/components/users/users-manager'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const isAdmin = await isAdminUser(supabase, user)
  if (!isAdmin) {
    redirect('/settings')
  }

  let initialUsers: ManagedUser[] = []
  let configError: string | null = null

  try {
    const admin = createAdminClient()
    const [{ data, error }, { data: profilesData }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from('profiles').select('id, role'),
    ])

    if (error) {
      configError = error.message
    } else {
      const roleMap = new Map<string, UserRole>()
      for (const p of (profilesData as { id: string; role: string }[] | null) || []) {
        roleMap.set(p.id, p.role === 'admin' ? 'admin' : 'user')
      }

      initialUsers = (data.users || [])
        .map((u) => {
          const meta = (u.user_metadata || {}) as Record<string, unknown>
          const fullName =
            typeof meta.full_name === 'string' && meta.full_name.trim()
              ? meta.full_name.trim()
              : typeof meta.name === 'string' && meta.name.trim()
                ? meta.name.trim()
                : null

          const role: UserRole = isPrimaryAdminEmail(u.email)
            ? 'admin'
            : roleMap.get(u.id) || 'user'

          return {
            id: u.id,
            email: u.email || '',
            fullName,
            role,
            createdAt: u.created_at,
            lastSignInAt: u.last_sign_in_at ?? null,
            emailConfirmedAt: u.email_confirmed_at ?? null,
          }
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  } catch (err) {
    configError =
      err instanceof Error
        ? err.message
        : 'Falta configurar SUPABASE_SERVICE_ROLE_KEY para gestionar usuarios.'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <UsersManager
        currentUserId={user.id}
        initialUsers={initialUsers}
        configError={configError}
      />
    </div>
  )
}
