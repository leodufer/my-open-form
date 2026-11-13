import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuestionSegment, ResourceShare, ReusableQuestion } from '@/lib/database.types'
import { SegmentEditor } from '@/components/segments/segment-editor'

export const dynamic = 'force-dynamic'

interface EditSegmentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditSegmentPage({ params }: EditSegmentPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: segmentData, error: segmentError }, { data: reusableData }] = await Promise.all([
    supabase
      .from('question_segments')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('reusable_questions')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  const segment = segmentData as QuestionSegment | null
  const reusableQuestions = (reusableData as ReusableQuestion[] | null) ?? []

  if (segmentError || !segment) {
    notFound()
  }

  if (segment.user_id !== user.id) {
    const { data: shareData } = await supabase
      .from('resource_shares')
      .select('permission')
      .eq('resource_type', 'question_segment')
      .eq('resource_id', id)
      .eq('shared_with_user_id', user.id)
      .single()

    const share = shareData as Pick<ResourceShare, 'permission'> | null
    if (!share) {
      notFound()
    }
    if (share.permission !== 'edit') {
      redirect(`/segments/${id}/responses`)
    }
  }

  return (
    <SegmentEditor
      userId={user.id}
      segment={segment}
      reusableQuestions={reusableQuestions}
    />
  )
}

