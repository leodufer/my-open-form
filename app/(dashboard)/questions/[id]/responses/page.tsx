import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCollections } from '@/lib/collections'
import { Form, Response as FormResponse, ReusableQuestion } from '@/lib/database.types'
import { ReusableQuestionResponsesDashboard } from '@/components/questions/reusable-question-responses-dashboard'

export const dynamic = 'force-dynamic'

interface ReusableQuestionResponsesPageProps {
  params: Promise<{ id: string }>
}

export default async function ReusableQuestionResponsesPage({
  params,
}: ReusableQuestionResponsesPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: questionData, error: questionError }, { data: sharesData }, { collections }] =
    await Promise.all([
      supabase
        .from('reusable_questions')
        .select('*')
        .eq('id', id)
        .single(),
      supabase
        .from('resource_shares')
        .select('resource_id')
        .eq('shared_with_user_id', user.id)
        .eq('resource_type', 'form'),
      getUserCollections(supabase, user.id),
    ])

  const question = questionData as ReusableQuestion | null

  if (questionError || !question) {
    notFound()
  }

  const sharedFormIds =
    (sharesData as { resource_id: string }[] | null)?.map((s) => s.resource_id) ?? []

  let formsQuery = supabase
    .from('forms')
    .select('id, title, slug, status, questions, collection_id')
    .order('updated_at', { ascending: false })

  if (sharedFormIds.length > 0) {
    formsQuery = formsQuery.or(`user_id.eq.${user.id},id.in.(${sharedFormIds.join(',')})`)
  } else {
    formsQuery = formsQuery.eq('user_id', user.id)
  }

  const { data: formsData } = await formsQuery
  const forms =
    (formsData as Pick<Form, 'id' | 'title' | 'slug' | 'status' | 'questions' | 'collection_id'>[] | null) ??
    []

  const formIds = forms.map((f) => f.id)
  let responses: Pick<FormResponse, 'id' | 'form_id' | 'answers' | 'submitted_at'>[] = []

  if (formIds.length > 0) {
    const { data: responsesData } = await supabase
      .from('responses')
      .select('id, form_id, answers, submitted_at')
      .in('form_id', formIds)
      .order('submitted_at', { ascending: false })

    responses =
      (responsesData as Pick<FormResponse, 'id' | 'form_id' | 'answers' | 'submitted_at'>[] | null) ??
      []
  }

  return (
    <ReusableQuestionResponsesDashboard
      question={question}
      forms={forms}
      collections={collections}
      responses={responses}
    />
  )
}
