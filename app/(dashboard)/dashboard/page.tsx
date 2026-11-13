import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Globe, BarChart3 } from 'lucide-react'
import { Form } from '@/lib/database.types'
import { getUserCollections } from '@/lib/collections'
import { CollectionsDashboard } from '@/components/dashboard/collections-dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [{ data: formsData }, { collections, defaultCollection }] = await Promise.all([
    supabase
      .from('forms')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false }),
    getUserCollections(supabase, user!.id),
  ])

  const forms = (formsData || []) as Form[]

  // Get response counts for each form
  const formIds = forms.map(f => f.id)
  const { data: responseCountsData } = formIds.length > 0 
    ? await supabase
        .from('responses')
        .select('form_id')
        .in('form_id', formIds)
    : { data: [] }

  const responseCounts: Record<string, number> = {}
  responseCountsData?.forEach((r: { form_id: string }) => {
    responseCounts[r.form_id] = (responseCounts[r.form_id] || 0) + 1
  })

  const totalResponses = responseCountsData?.length ?? 0
  const publishedCount = forms.filter(f => f.status === 'published').length
  const stats = [
    { label: 'Formularios', value: forms.length, icon: FileText },
    { label: 'Publicados', value: publishedCount, icon: Globe },
    { label: 'Respuestas', value: totalResponses, icon: BarChart3 },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mis formularios</h1>
          <p className="text-sm text-slate-500 mt-1">Creá, publicá y revisá las respuestas de tus formularios.</p>
        </div>
        {forms.length > 0 && (
          <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-sm self-start sm:self-auto">
            <Link href="/forms/new">
              <Plus className="w-4 h-4" />
              Nuevo formulario
            </Link>
          </Button>
        )}
      </div>

      {forms.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <stat.icon className="w-3.5 h-3.5" />
                {stat.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      <CollectionsDashboard
        initialForms={forms}
        initialCollections={collections}
        defaultCollectionId={defaultCollection.id}
        responseCounts={responseCounts}
        userId={user!.id}
      />
    </div>
  )
}
