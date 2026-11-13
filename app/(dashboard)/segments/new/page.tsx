import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReusableQuestion } from '@/lib/database.types'
import { SegmentEditor } from '@/components/segments/segment-editor'

export const dynamic = 'force-dynamic'

export default async function NewSegmentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: reusableData } = await supabase
    .from('reusable_questions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const reusableQuestions = (reusableData as ReusableQuestion[] | null) ?? []

  return <SegmentEditor userId={user.id} reusableQuestions={reusableQuestions} />
}

