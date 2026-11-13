'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Form,
  Json,
  QuestionConfig,
  QuestionSegment,
  Response as FormResponse,
} from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  FileText,
  Layers,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

interface SegmentsManagerProps {
  initialSegments: QuestionSegment[]
  forms: Pick<Form, 'id' | 'title' | 'slug' | 'status' | 'questions' | 'collection_id'>[]
  responses: Pick<FormResponse, 'id' | 'form_id' | 'answers' | 'submitted_at'>[]
}

export function SegmentsManager({
  initialSegments,
  forms,
  responses,
}: SegmentsManagerProps) {
  const supabase = createClient()
  const [segments, setSegments] = useState<QuestionSegment[]>(initialSegments)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<QuestionSegment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Compute usage (forms) and response counts per segmentId
  const usageBySegmentId = useMemo(() => {
    const map = new Map<
      string,
      {
        forms: Pick<Form, 'id' | 'title' | 'slug' | 'status' | 'collection_id'>[]
        responseCount: number
      }
    >()

    const ensureEntry = (segmentId: string) => {
      let entry = map.get(segmentId)
      if (!entry) {
        entry = { forms: [], responseCount: 0 }
        map.set(segmentId, entry)
      }
      return entry
    }

    const segmentQuestionIdsByForm = new Map<string, Map<string, string[]>>()

    for (const form of forms) {
      const formQuestions = (form.questions as QuestionConfig[]) || []
      for (const q of formQuestions) {
        if (!q.segmentId) continue
        const entry = ensureEntry(q.segmentId)
        if (!entry.forms.some((f) => f.id === form.id)) {
          entry.forms.push(form)
        }
        let segMap = segmentQuestionIdsByForm.get(form.id)
        if (!segMap) {
          segMap = new Map()
          segmentQuestionIdsByForm.set(form.id, segMap)
        }
        const ids = segMap.get(q.segmentId) || []
        ids.push(q.id)
        segMap.set(q.segmentId, ids)
      }
    }

    for (const resp of responses) {
      const segMap = segmentQuestionIdsByForm.get(resp.form_id)
      if (!segMap) continue
      const answers = (resp.answers || {}) as Record<string, Json>
      for (const [segmentId, qIds] of segMap.entries()) {
        const hasAnyAnswer = qIds.some((qId) => answers[qId] !== undefined)
        if (hasAnyAnswer) {
          ensureEntry(segmentId).responseCount += 1
        }
      }
    }

    return map
  }, [forms, responses])

  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments
    const q = searchQuery.toLowerCase()
    return segments.filter(
      (seg) =>
        seg.name.toLowerCase().includes(q) ||
        (seg.description && seg.description.toLowerCase().includes(q)) ||
        ((seg.questions as QuestionConfig[]) || []).some((sq) =>
          sq.title.toLowerCase().includes(q)
        )
    )
  }, [segments, searchQuery])

  const handleDeleteSegment = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const { error } = await supabase
      .from('question_segments')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      toast.error('No se pudo eliminar el segmento')
    } else {
      setSegments(segments.filter((s) => s.id !== deleteTarget.id))
      toast.success('Segmento eliminado')
      setDeleteTarget(null)
    }
    setIsDeleting(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Segmentos reutilizables</h1>
          <p className="text-slate-600 mt-1">
            Agrupá varias preguntas en un segmento para reutilizarlas en bloque y consultar sus respuestas identificando de qué formulario provienen.
          </p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0">
          <Link href="/segments/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo segmento
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar segmentos o preguntas..."
          className="pl-10 bg-white"
        />
      </div>

      {/* Segments List */}
      {filteredSegments.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 bg-white/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Layers className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {segments.length === 0
                ? 'Todavía no tenés segmentos reutilizables'
                : 'No se encontraron segmentos con esa búsqueda'}
            </h3>
            <p className="text-slate-600 max-w-md mb-6">
              {segments.length === 0
                ? 'Creá un segmento con varias preguntas (por ejemplo, datos de contacto o encuesta de satisfacción) para insertarlo en múltiples formularios.'
                : 'Probá con otro término de búsqueda.'}
            </p>
            {segments.length === 0 && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/segments/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primer segmento
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSegments.map((seg) => {
            const segQuestions = (seg.questions as QuestionConfig[]) || []
            const usage = usageBySegmentId.get(seg.id)
            const usedInForms = usage?.forms || []
            const totalResponses = usage?.responseCount || 0

            return (
              <Card key={seg.id} className="bg-white border-slate-200 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="secondary" className="gap-1.5 font-normal">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      {segQuestions.length}{' '}
                      {segQuestions.length === 1 ? 'pregunta' : 'preguntas'}
                    </Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Editar"
                        asChild
                      >
                        <Link href={`/segments/${seg.id}/edit`}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:text-red-600"
                        title="Eliminar"
                        onClick={() => setDeleteTarget(seg)}
                      >
                        <Trash2 className="w-4 h-4 text-slate-500" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg text-slate-900 mt-2">{seg.name}</CardTitle>
                  {seg.description && (
                    <CardDescription className="line-clamp-2">{seg.description}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Questions preview */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Preguntas incluidas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {segQuestions.slice(0, 4).map((q, idx) => (
                        <Badge key={q.id} variant="outline" className="font-normal text-xs bg-slate-50">
                          {idx + 1}. {q.title}
                        </Badge>
                      ))}
                      {segQuestions.length > 4 && (
                        <Badge variant="outline" className="font-normal text-xs text-slate-500">
                          +{segQuestions.length - 4} más
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Forms using this segment */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">
                      Usado en {usedInForms.length}{' '}
                      {usedInForms.length === 1 ? 'formulario' : 'formularios'}
                    </p>
                    {usedInForms.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {usedInForms.map((f) => (
                          <Link
                            key={f.id}
                            href={`/forms/${f.id}/responses`}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[180px]">{f.title}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Todavía no se agregó a ningún formulario
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-600 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      {totalResponses} {totalResponses === 1 ? 'respuesta' : 'respuestas'}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/segments/${seg.id}/responses`}>
                        Ver respuestas ({totalResponses})
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar segmento reutilizable?</DialogTitle>
            <DialogDescription>
              Se eliminará &ldquo;{deleteTarget?.name}&rdquo; de tu biblioteca. Los formularios que ya lo contienen conservarán sus preguntas y sus respuestas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteSegment} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
