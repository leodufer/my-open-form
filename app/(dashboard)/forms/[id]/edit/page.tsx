import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FormBuilder } from '@/components/form-builder/form-builder'
import { Form } from '@/lib/database.types'
import { getUserCollections } from '@/lib/collections'

export const dynamic = 'force-dynamic'

interface EditFormPageProps {
  params: Promise<{ id: string }>
}

export default async function EditFormPage({ params }: EditFormPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data, error }, { collections }] = await Promise.all([
    supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    getUserCollections(supabase, user.id),
  ])

  const form = data as Form | null

  if (error || !form) {
    notFound()
  }

  return <FormBuilder form={form} collections={collections} />
}

