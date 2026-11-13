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
        .eq('user_id', user.id)
        .single(),
      getUserCollections(supabase, user.id),
      supabase
        .from('reusable_questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('question_segments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

  const form = data as Form | null
  const reusableQuestions = (reusableData as ReusableQuestion[] | null) ?? []
  const questionSegments = (segmentsData as QuestionSegment[] | null) ?? []

  if (error || !form) {
    notFound()
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

