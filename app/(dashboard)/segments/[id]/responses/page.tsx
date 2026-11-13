import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCollections } from '@/lib/collections'
import { Form, QuestionSegment, ResourceShare, Response as FormResponse } from '@/lib/database.types'
import { SegmentResponsesDashboard } from '@/components/segments/segment-responses-dashboard'

export const dynamic = 'force-dynamic'

interface SegmentResponsesPageProps {
  params: Promise<{ id: string }>
}

export default async function SegmentResponsesPage({ params }: SegmentResponsesPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: sharedFormsData } = await supabase
    .from('resource_shares')
    .select('resource_id')
    .eq('shared_with_user_id', user.id)
    .eq('resource_type', 'form')

  const sharedFormIds = ((sharedFormsData as Pick<ResourceShare, 'resource_id'>[] | null) ?? []).map(
    (s) => s.resource_id
  )

  const formsQuery = supabase
    .from('forms')
    .select('id, title, slug, status, questions, collection_id')
    .order('updated_at', { ascending: false })

  if (sharedFormIds.length > 0) {
    formsQuery.or(`user_id.eq.${user.id},id.in.(${sharedFormIds.join(',')})`)
  } else {
    formsQuery.eq('user_id', user.id)
  }

  const [{ data: segmentData, error: segmentError }, { data: formsData }, { collections }] =
    await Promise.all([
      supabase
        .from('question_segments')
        .select('*')
        .eq('id', id)
        .single(),
      formsQuery,
      getUserCollections(supabase, user.id),
    ])

  const segment = segmentData as QuestionSegment | null

  if (segmentError || !segment) {
    notFound()
  }

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
    <SegmentResponsesDashboard
      segment={segment}
      forms={forms}
      collections={collections}
      responses={responses}
    />
  )
}

