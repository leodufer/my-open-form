import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResponsesDashboard } from '@/components/responses/responses-dashboard'
import { Form, Response } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

interface ResponsesPageProps {
  params: Promise<{ id: string }>
}

export default async function ResponsesPage({ params }: ResponsesPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: formData, error: formError } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single()

  const form = formData as Form | null

  if (formError || !form) {
    notFound()
  }

  if (form.user_id !== user.id) {
    const { data: shareData } = await supabase
      .from('resource_shares')
      .select('id')
      .eq('resource_type', 'form')
      .eq('resource_id', form.id)
      .eq('shared_with_user_id', user.id)
      .single()

    if (!shareData) {
      notFound()
    }
  }

  const { data: responsesData } = await supabase
    .from('responses')
    .select('*')
    .eq('form_id', id)
    .order('submitted_at', { ascending: false })

  const responses = (responsesData || []) as Response[]

  return (
    <ResponsesDashboard 
      form={form} 
      responses={responses} 
    />
  )
}

