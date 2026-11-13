import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Form, QuestionSegment, Response as FormResponse } from '@/lib/database.types'
import { SegmentsManager } from '@/components/segments/segments-manager'

export const dynamic = 'force-dynamic'

export default async function SegmentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: segmentsData }, { data: formsData }] = await Promise.all([
    supabase
      .from('question_segments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('forms')
      .select('id, title, slug, status, questions, collection_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ])

  const segments = (segmentsData as QuestionSegment[] | null) ?? []
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <SegmentsManager
        initialSegments={segments}
        forms={forms}
        responses={responses}
      />
    </div>
  )
}
