import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminUser, isPrimaryAdminEmail, UserRole } from '@/lib/auth/roles'

export interface ManagedUser {
  id: string
  email: string
  fullName: string | null
  role: UserRole
  createdAt: string
  lastSignInAt: string | null
  emailConfirmedAt: string | null
}

function serializeUser(
  u: {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
    created_at: string
    last_sign_in_at?: string | null
    email_confirmed_at?: string | null
  },
  roleMap: Map<string, UserRole>
): ManagedUser {
  const meta = u.user_metadata || {}
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
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json(
      { error: 'Acceso denegado: solo los administradores pueden gestionar usuarios' },
      { status: 403 }
    )
  }

  try {
    const admin = createAdminClient()
    const [{ data, error }, { data: profilesData }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from('profiles').select('id, role'),
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const roleMap = new Map<string, UserRole>()
    for (const p of (profilesData as { id: string; role: string }[] | null) || []) {
      roleMap.set(p.id, p.role === 'admin' ? 'admin' : 'user')
    }

    const users = (data.users || [])
      .map((u) => serializeUser(u, roleMap))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ users })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json(
      { error: 'Acceso denegado: solo los administradores pueden crear usuarios' },
      { status: 403 }
    )
  }

  let body: { email?: string; password?: string; fullName?: string; role?: UserRole }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const fullName = (body.fullName || '').trim()
  const requestedRole: UserRole = isPrimaryAdminEmail(email)
    ? 'admin'
    : body.role === 'admin'
      ? 'admin'
      : 'user'

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Ingresá un correo electrónico válido' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres' },
      { status: 400 }
    )
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    })

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || 'No se pudo crear el usuario' },
        { status: 400 }
      )
    }

    if (requestedRole === 'admin') {
      await admin
        .from('profiles')
        .update({ role: 'admin' } as never)
        .eq('id', data.user.id)
    }

    const roleMap = new Map<string, UserRole>([[data.user.id, requestedRole]])
    return NextResponse.json({ user: serializeUser(data.user, roleMap) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
