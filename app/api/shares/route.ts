import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SharePermission, ShareResourceType } from '@/lib/database.types'

export interface ShareEntry {
  id: string
  resourceType: ShareResourceType
  resourceId: string
  sharedWithUserId: string
  email: string
  fullName: string | null
  permission: SharePermission
  createdAt: string
}

const VALID_TYPES: ShareResourceType[] = ['form', 'reusable_question', 'question_segment']

async function verifyResourceOwnership(
  resourceType: ShareResourceType,
  resourceId: string,
  userId: string
): Promise<boolean> {
  const admin = createAdminClient()
  const table =
    resourceType === 'form'
      ? 'forms'
      : resourceType === 'reusable_question'
        ? 'reusable_questions'
        : 'question_segments'

  const { data } = await admin
    .from(table)
    .select('user_id')
    .eq('id', resourceId)
    .single()

  const row = data as { user_id?: string } | null
  return row?.user_id === userId
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const resourceType = searchParams.get('resourceType') as ShareResourceType | null
  const resourceId = searchParams.get('resourceId')

  if (!resourceType || !VALID_TYPES.includes(resourceType) || !resourceId) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  try {
    const isOwner = await verifyResourceOwnership(resourceType, resourceId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'No tenés permiso para ver este recurso' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: sharesData, error } = await admin
      .from('resource_shares')
      .select('id, resource_type, resource_id, shared_with_user_id, permission, created_at')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const shares =
      (sharesData as {
        id: string
        resource_type: ShareResourceType
        resource_id: string
        shared_with_user_id: string
        permission: SharePermission
        created_at: string
      }[] | null) ?? []

    if (shares.length === 0) {
      return NextResponse.json({ shares: [] })
    }

    const recipientIds = shares.map((s) => s.shared_with_user_id)
    const { data: profilesData } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', recipientIds)

    const profileMap = new Map<string, { email: string; full_name: string | null }>()
    for (const p of (profilesData as { id: string; email: string; full_name: string | null }[] | null) || []) {
      profileMap.set(p.id, { email: p.email, full_name: p.full_name })
    }

    const result: ShareEntry[] = shares.map((s) => {
      const profile = profileMap.get(s.shared_with_user_id)
      return {
        id: s.id,
        resourceType: s.resource_type,
        resourceId: s.resource_id,
        sharedWithUserId: s.shared_with_user_id,
        email: profile?.email || '',
        fullName: profile?.full_name || null,
        permission: s.permission,
        createdAt: s.created_at,
      }
    })

    return NextResponse.json({ shares: result })
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

  let body: {
    resourceType?: ShareResourceType
    resourceId?: string
    email?: string
    permission?: SharePermission
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const resourceType = body.resourceType
  const resourceId = body.resourceId
  const targetEmail = (body.email || '').trim().toLowerCase()
  const permission: SharePermission = body.permission === 'view' ? 'view' : 'edit'

  if (!resourceType || !VALID_TYPES.includes(resourceType) || !resourceId) {
    return NextResponse.json({ error: 'Recurso inválido' }, { status: 400 })
  }
  if (!targetEmail || !targetEmail.includes('@')) {
    return NextResponse.json({ error: 'Ingresá un correo electrónico válido' }, { status: 400 })
  }

  try {
    const isOwner = await verifyResourceOwnership(resourceType, resourceId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Solo el propietario puede compartir este recurso' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', targetEmail)
      .single()

    const recipient = targetProfile as { id: string; email: string; full_name: string | null } | null
    if (!recipient) {
      return NextResponse.json(
        { error: 'No existe ningún usuario registrado con ese correo electrónico' },
        { status: 404 }
      )
    }

    if (recipient.id === user.id) {
      return NextResponse.json(
        { error: 'No podés compartir un recurso con vos mismo' },
        { status: 400 }
      )
    }

    const { data: upserted, error } = await admin
      .from('resource_shares')
      .upsert(
        {
          resource_type: resourceType,
          resource_id: resourceId,
          owner_id: user.id,
          shared_with_user_id: recipient.id,
          permission,
        } as never,
        { onConflict: 'resource_type,resource_id,shared_with_user_id' }
      )
      .select('id, resource_type, resource_id, shared_with_user_id, permission, created_at')
      .single()

    if (error || !upserted) {
      return NextResponse.json(
        { error: error?.message || 'No se pudo compartir el recurso' },
        { status: 500 }
      )
    }

    const row = upserted as {
      id: string
      resource_type: ShareResourceType
      resource_id: string
      shared_with_user_id: string
      permission: SharePermission
      created_at: string
    }

    const share: ShareEntry = {
      id: row.id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      sharedWithUserId: row.shared_with_user_id,
      email: recipient.email,
      fullName: recipient.full_name,
      permission: row.permission,
      createdAt: row.created_at,
    }

    return NextResponse.json({ share }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

