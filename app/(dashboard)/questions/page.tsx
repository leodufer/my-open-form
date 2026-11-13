import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCollections } from '@/lib/collections'
import {
  Form,
  Response as FormResponse,
  ReusableQuestion,
  SharePermission,
} from '@/lib/database.types'
import { ReusableQuestionsManager } from '@/components/questions/reusable-questions-manager'

export const dynamic = 'force-dynamic'

export default async function ReusableQuestionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: reusableData }, { data: sharesData }, { collections }] = await Promise.all([
    supabase
      .from('reusable_questions')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('resource_shares')
      .select('resource_type, resource_id, permission')
      .eq('shared_with_user_id', user.id),
    getUserCollections(supabase, user.id),
  ])

  const sharedQuestionPermissions: Record<string, SharePermission> = {}
  const sharedFormIds: string[] = []

  for (const s of (sharesData as {
    resource_type: string
    resource_id: string
    permission: SharePermission
  }[] | null) || []) {
    if (s.resource_type === 'reusable_question') {
      sharedQuestionPermissions[s.resource_id] = s.permission
    } else if (s.resource_type === 'form') {
      sharedFormIds.push(s.resource_id)
    }
  }

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

  const reusableQuestions = (reusableData as ReusableQuestion[] | null) ?? []
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
      <ReusableQuestionsManager
        userId={user.id}
        initialQuestions={reusableQuestions}
        forms={forms}
        collections={collections}
        responses={responses}
        sharedPermissions={sharedQuestionPermissions}
      />
    </div>
  )
}
