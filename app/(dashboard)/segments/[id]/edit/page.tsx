import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuestionSegment, ReusableQuestion } from '@/lib/database.types'
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
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('reusable_questions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const segment = segmentData as QuestionSegment | null
  const reusableQuestions = (reusableData as ReusableQuestion[] | null) ?? []

  if (segmentError || !segment) {
    notFound()
  }

  return (
    <SegmentEditor
      userId={user.id}
      segment={segment}
      reusableQuestions={reusableQuestions}
    />
  )
}

