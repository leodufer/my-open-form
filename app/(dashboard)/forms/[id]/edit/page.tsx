import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FormBuilder } from '@/components/form-builder/form-builder'
import { Form, QuestionSegment, ReusableQuestion } from '@/lib/database.types'
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

  const [{ data, error }, { collections }, { data: reusableData }, { data: segmentsData }] =
    await Promise.all([
      supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single(),
      getUserCollections(supabase, user.id),
      supabase
        .from('reusable_questions')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('question_segments')
        .select('*')
        .order('created_at', { ascending: false }),
    ])

  const form = data as Form | null
  const reusableQuestions = (reusableData as ReusableQuestion[] | null) ?? []
  const questionSegments = (segmentsData as QuestionSegment[] | null) ?? []

  if (error || !form) {
    notFound()
  }

  if (form.user_id !== user.id) {
    const { data: shareData } = await supabase
      .from('resource_shares')
      .select('permission')
      .eq('resource_type', 'form')
      .eq('resource_id', form.id)
      .eq('shared_with_user_id', user.id)
      .single()

    const share = shareData as { permission?: string } | null
    if (!share) {
      notFound()
    }
    if (share.permission !== 'edit') {
      redirect(`/forms/${id}/responses`)
    }
  }

  return (
    <FormBuilder
      form={form}
      collections={collections}
      reusableQuestions={reusableQuestions}
      questionSegments={questionSegments}
    />
  )
}

