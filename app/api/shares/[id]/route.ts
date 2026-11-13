import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SharePermission } from '@/lib/database.types'

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

  let body: { permission?: SharePermission }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const permission: SharePermission = body.permission === 'view' ? 'view' : 'edit'

  try {
    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('resource_shares')
      .select('owner_id')
      .eq('id', id)
      .single()

    const share = existing as { owner_id?: string } | null
    if (!share) {
      return NextResponse.json({ error: 'Compartido no encontrado' }, { status: 404 })
    }
    if (share.owner_id !== user.id) {
      return NextResponse.json({ error: 'Solo el propietario puede modificar el permiso' }, { status: 403 })
    }

    const { error } = await admin
      .from('resource_shares')
      .update({ permission } as never)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, permission })
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

  try {
    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('resource_shares')
      .select('owner_id, shared_with_user_id')
      .eq('id', id)
      .single()

    const share = existing as { owner_id?: string; shared_with_user_id?: string } | null
    if (!share) {
      return NextResponse.json({ error: 'Compartido no encontrado' }, { status: 404 })
    }
    if (share.owner_id !== user.id && share.shared_with_user_id !== user.id) {
      return NextResponse.json({ error: 'No tenés permiso para revocar este acceso' }, { status: 403 })
    }

    const { error } = await admin.from('resource_shares').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

