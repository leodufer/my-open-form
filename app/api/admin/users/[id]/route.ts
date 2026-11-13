import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminUser, isPrimaryAdminEmail, UserRole } from '@/lib/auth/roles'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const isSelf = user.id === id
  const isAdmin = await isAdminUser(supabase, user)

  if (!isSelf && !isAdmin) {
    return NextResponse.json(
      { error: 'Acceso denegado: solo los administradores pueden modificar otros usuarios' },
      { status: 403 }
    )
  }

  let body: { password?: string; fullName?: string; role?: UserRole }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const updates: { password?: string; user_metadata?: { full_name: string } } = {}

  if (body.password !== undefined) {
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }
    updates.password = body.password
  }

  if (body.fullName !== undefined) {
    updates.user_metadata = { full_name: body.fullName.trim() }
  }

  const wantsRoleChange = body.role !== undefined
  if (wantsRoleChange && !isAdmin) {
    return NextResponse.json(
      { error: 'Solo los administradores pueden cambiar roles' },
      { status: 403 }
    )
  }

  if (Object.keys(updates).length === 0 && !wantsRoleChange) {
    return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    if (Object.keys(updates).length > 0) {
      const { data, error } = await admin.auth.admin.updateUserById(id, updates)
      if (error || !data.user) {
        return NextResponse.json(
          { error: error?.message || 'No se pudo actualizar el usuario' },
          { status: 400 }
        )
      }
      if (body.fullName !== undefined) {
        await admin
          .from('profiles')
          .update({ full_name: body.fullName.trim() } as never)
          .eq('id', id)
      }
    }

    if (wantsRoleChange && isAdmin) {
      const { data: targetData } = await admin.auth.admin.getUserById(id)
      const targetEmail = targetData.user?.email
      if (isPrimaryAdminEmail(targetEmail) && body.role !== 'admin') {
        return NextResponse.json(
          { error: 'No se puede quitar el rol de administrador al administrador principal' },
          { status: 400 }
        )
      }
      if (isSelf && body.role !== 'admin') {
        return NextResponse.json(
          { error: 'No podés quitarte tu propio rol de administrador' },
          { status: 400 }
        )
      }
      const nextRole: UserRole = body.role === 'admin' ? 'admin' : 'user'
      await admin
        .from('profiles')
        .update({ role: nextRole } as never)
        .eq('id', id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json(
      { error: 'Acceso denegado: solo los administradores pueden eliminar usuarios' },
      { status: 403 }
    )
  }

  if (user.id === id) {
    return NextResponse.json(
      { error: 'No podés eliminar tu propio usuario mientras estás conectado' },
      { status: 400 }
    )
  }

  try {
    const admin = createAdminClient()
    const { data: targetData } = await admin.auth.admin.getUserById(id)
    if (isPrimaryAdminEmail(targetData.user?.email)) {
      return NextResponse.json(
        { error: 'No se puede eliminar al administrador principal' },
        { status: 400 }
      )
    }

    const { error } = await admin.auth.admin.deleteUser(id)

    if (error) {
      return NextResponse.json(
        { error: error.message || 'No se pudo eliminar el usuario' },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
