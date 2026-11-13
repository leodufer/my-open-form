'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Collection,
  Form,
  Json,
  QuestionConfig,
  QuestionType,
  Response as FormResponse,
  ReusableQuestion,
} from '@/lib/database.types'
import { createDefaultQuestion, getQuestionTypeInfo, questionTypes } from '@/lib/questions'
import {
  extractReusableConfig,
  formatReusableAnswer,
  reusableQuestionToFormQuestion,
} from '@/lib/reusable-questions'
import { QuestionEditor } from '@/components/form-builder/question-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Bookmark,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

interface ReusableQuestionsManagerProps {
  userId: string
  initialQuestions: ReusableQuestion[]
  forms: Pick<Form, 'id' | 'title' | 'slug' | 'status' | 'questions' | 'collection_id'>[]
  collections: Collection[]
  responses: Pick<FormResponse, 'id' | 'form_id' | 'answers' | 'submitted_at'>[]
}

interface ConsolidatedAnswerRow {
  responseId: string
  formId: string
  formTitle: string
  formSlug: string
  collectionName: string
  answer: Json | undefined
  formattedAnswer: string
  submittedAt: string
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ReusableQuestionsManager({
  userId,
  initialQuestions,
  forms,
  collections,
  responses,
}: ReusableQuestionsManagerProps) {
  const supabase = createClient()
  const [questions, setQuestions] = useState<ReusableQuestion[]>(initialQuestions)
  const [searchQuery, setSearchQuery] = useState('')

  // Create / Edit dialog state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingReusableId, setEditingReusableId] = useState<string | null>(null)
  const [draftQuestion, setDraftQuestion] = useState<QuestionConfig>(() =>
    createDefaultQuestion('short_text')
  )
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ReusableQuestion | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const collectionMap = useMemo(() => {
    const map = new Map<string, string>()
    collections.forEach((c) => map.set(c.id, c.name))
    return map
  }, [collections])

  // Map each reusableQuestionId -> forms that use it & consolidated answer rows
  const usageAndResponsesByReusableId = useMemo(() => {
    const map = new Map<
      string,
      {
        forms: Pick<Form, 'id' | 'title' | 'slug' | 'status' | 'collection_id'>[]
        rows: ConsolidatedAnswerRow[]
      }
    >()

    const ensureEntry = (reusableId: string) => {
      let entry = map.get(reusableId)
      if (!entry) {
        entry = { forms: [], rows: [] }
        map.set(reusableId, entry)
      }
      return entry
    }

    // Index form questions by formId -> Map<reusableId, questionIds[]>
    const formQuestionIdsByForm = new Map<string, Map<string, string[]>>()

    for (const form of forms) {
      const formQuestions = (form.questions as QuestionConfig[]) || []
      for (const q of formQuestions) {
        if (!q.reusableQuestionId) continue
        const entry = ensureEntry(q.reusableQuestionId)
        if (!entry.forms.some((f) => f.id === form.id)) {
          entry.forms.push(form)
        }
        let qMap = formQuestionIdsByForm.get(form.id)
        if (!qMap) {
          qMap = new Map()
          formQuestionIdsByForm.set(form.id, qMap)
        }
        const ids = qMap.get(q.reusableQuestionId) || []
        ids.push(q.id)
        qMap.set(q.reusableQuestionId, ids)
      }
    }

    const formById = new Map(forms.map((f) => [f.id, f]))

    for (const resp of responses) {
      const qMap = formQuestionIdsByForm.get(resp.form_id)
      const form = formById.get(resp.form_id)
      if (!qMap || !form) continue

      const answers = (resp.answers || {}) as Record<string, Json>
      const collectionName = form.collection_id
        ? collectionMap.get(form.collection_id) || 'General'
        : 'General'

      for (const [reusableId, questionIds] of qMap.entries()) {
        const entry = ensureEntry(reusableId)
        for (const qId of questionIds) {
          const answer = answers[qId]
          if (answer === undefined) continue
          entry.rows.push({
            responseId: resp.id,
            formId: form.id,
            formTitle: form.title,
            formSlug: form.slug,
            collectionName,
            answer,
            formattedAnswer: formatReusableAnswer(answer),
            submittedAt: resp.submitted_at,
          })
        }
      }
    }

    return map
  }, [forms, responses, collectionMap])

  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions
    const q = searchQuery.toLowerCase()
    return questions.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    )
  }, [questions, searchQuery])

  const openCreateDialog = () => {
    setEditingReusableId(null)
    setDraftQuestion(createDefaultQuestion('short_text'))
    setEditorOpen(true)
  }

  const openEditDialog = (reusable: ReusableQuestion) => {
    setEditingReusableId(reusable.id)
    setDraftQuestion(reusableQuestionToFormQuestion(reusable))
    setEditorOpen(true)
  }

  const handleTypeChange = (type: QuestionType) => {
    const base = createDefaultQuestion(type)
    setDraftQuestion({
      ...base,
      id: draftQuestion.id,
      title: draftQuestion.title,
      description: draftQuestion.description,
      required: type === 'statement' ? false : draftQuestion.required,
    })
  }

  const handleSaveReusable = async () => {
    if (!draftQuestion.title.trim()) {
      toast.error('Escribí el texto de la pregunta antes de guardar')
      return
    }

    setIsSaving(true)
    const payload = {
      type: draftQuestion.type,
      title: draftQuestion.title.trim(),
      description: draftQuestion.description?.trim() || null,
      required: draftQuestion.type === 'statement' ? false : draftQuestion.required,
      config: extractReusableConfig(draftQuestion),
    }

    if (editingReusableId) {
      const { data, error } = await supabase
        .from('reusable_questions')
        .update(payload as never)
        .eq('id', editingReusableId)
        .select('*')
        .single()

      if (error || !data) {
        toast.error('No se pudo actualizar la pregunta reutilizable')
      } else {
        setQuestions(questions.map((q) => (q.id === editingReusableId ? (data as ReusableQuestion) : q)))
        toast.success('Pregunta reutilizable actualizada')
        setEditorOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from('reusable_questions')
        .insert({ ...payload, user_id: userId } as never)
        .select('*')
        .single()

      if (error || !data) {
        toast.error('No se pudo crear la pregunta reutilizable')
      } else {
        setQuestions([data as ReusableQuestion, ...questions])
        toast.success('Pregunta reutilizable creada')
        setEditorOpen(false)
      }
    }

    setIsSaving(false)
  }

  const handleDeleteReusable = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const { error } = await supabase
      .from('reusable_questions')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      toast.error('No se pudo eliminar la pregunta reutilizable')
    } else {
      setQuestions(questions.filter((q) => q.id !== deleteTarget.id))
      toast.success('Pregunta reutilizable eliminada')
      setDeleteTarget(null)
    }
    setIsDeleting(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Preguntas reutilizables</h1>
          <p className="text-slate-600 mt-1">
            Creá preguntas una sola vez, reutilizalas en varios formularios y consultá de qué formulario proviene cada respuesta.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nueva pregunta reutilizable
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar preguntas reutilizables..."
          className="pl-10 bg-white"
        />
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 bg-white/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Bookmark className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {questions.length === 0
                ? 'Todavía no tenés preguntas reutilizables'
                : 'No se encontraron preguntas con esa búsqueda'}
            </h3>
            <p className="text-slate-600 max-w-md mb-6">
              {questions.length === 0
                ? 'Creá preguntas reutilizables acá o guardalas desde el editor de cualquier formulario para usarlas en múltiples formularios.'
                : 'Probá con otro término de búsqueda.'}
            </p>
            {questions.length === 0 && (
              <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Crear primera pregunta reutilizable
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map((rq) => {
            const typeInfo = getQuestionTypeInfo(rq.type)
            const Icon = typeInfo?.icon || FileText
            const usage = usageAndResponsesByReusableId.get(rq.id)
            const usedInForms = usage?.forms || []
            const totalResponses = usage?.rows.length || 0

            return (
              <Card key={rq.id} className="bg-white border-slate-200 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="gap-1.5 font-normal">
                        <Icon className="w-3.5 h-3.5 text-blue-600" />
                        {typeInfo?.label ?? rq.type}
                      </Badge>
                      {rq.required && (
                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                          Obligatoria
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Editar"
                        onClick={() => openEditDialog(rq)}
                      >
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:text-red-600"
                        title="Eliminar"
                        onClick={() => setDeleteTarget(rq)}
                      >
                        <Trash2 className="w-4 h-4 text-slate-500" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg text-slate-900 mt-2">{rq.title}</CardTitle>
                  {rq.description && (
                    <CardDescription className="line-clamp-2">{rq.description}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Forms using this question */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">
                      Usada en {usedInForms.length}{' '}
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
                      <Link href={`/questions/${rq.id}/responses`}>
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

      {/* Create / Edit Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingReusableId ? 'Editar pregunta reutilizable' : 'Nueva pregunta reutilizable'}
            </DialogTitle>
            <DialogDescription>
              Configurá la pregunta para poder insertarla en cualquier formulario.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto pr-1 space-y-4">
            {!editingReusableId && (
              <div className="px-4 pt-2">
                <Label className="text-sm font-medium">Tipo de pregunta</Label>
                <Select
                  value={draftQuestion.type}
                  onValueChange={(val) => handleTypeChange(val as QuestionType)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypes.map((qt) => (
                      <SelectItem key={qt.type} value={qt.type}>
                        {qt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <QuestionEditor
              question={draftQuestion}
              onUpdate={(updates) => setDraftQuestion({ ...draftQuestion, ...updates })}
              onDelete={() => {}}
              hideDelete
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveReusable}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingReusableId ? 'Guardar cambios' : 'Crear pregunta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar pregunta reutilizable?</DialogTitle>
            <DialogDescription>
              Se eliminará &ldquo;{deleteTarget?.title}&rdquo; de tu biblioteca. Los formularios que ya la contienen conservarán su copia y sus respuestas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteReusable} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

