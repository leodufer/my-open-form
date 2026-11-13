import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Form, QuestionSegment, ResourceShare, Response as FormResponse, SharePermission } from '@/lib/database.types'
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

  const { data: sharesData } = await supabase
    .from('resource_shares')
    .select('*')
    .eq('shared_with_user_id', user.id)
    .in('resource_type', ['question_segment', 'form'])

  const shares = (sharesData as ResourceShare[] | null) ?? []
  const sharedSegmentPermissions: Record<string, SharePermission> = {}
  const sharedFormIds: string[] = []
  for (const s of shares) {
    if (s.resource_type === 'question_segment') {
      sharedSegmentPermissions[s.resource_id] = s.permission
    } else if (s.resource_type === 'form') {
      sharedFormIds.push(s.resource_id)
    }
  }

  const formsQuery = supabase
    .from('forms')
    .select('id, title, slug, status, questions, collection_id')
    .order('updated_at', { ascending: false })

  if (sharedFormIds.length > 0) {
    formsQuery.or(`user_id.eq.${user.id},id.in.(${sharedFormIds.join(',')})`)
  } else {
    formsQuery.eq('user_id', user.id)
  }

  const [{ data: segmentsData }, { data: formsData }] = await Promise.all([
    supabase
      .from('question_segments')
      .select('*')
      .order('created_at', { ascending: false }),
    formsQuery,
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
        userId={user.id}
        initialSegments={segments}
        sharedPermissions={sharedSegmentPermissions}
        forms={forms}
        responses={responses}
      />
    </div>
  )
}
