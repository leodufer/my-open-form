'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  QuestionConfig,
  QuestionSegment,
  QuestionType,
  ReusableQuestion,
} from '@/lib/database.types'
import { createDefaultQuestion, getQuestionTypeInfo, questionTypes } from '@/lib/questions'
import { reusableQuestionToFormQuestion } from '@/lib/reusable-questions'
import { QuestionEditor } from '@/components/form-builder/question-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bookmark,
  ChevronDown,
  Layers,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'

interface SegmentEditorProps {
  userId: string
  segment?: QuestionSegment
  reusableQuestions: ReusableQuestion[]
}

export function SegmentEditor({
  userId,
  segment,
  reusableQuestions,
}: SegmentEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEditing = Boolean(segment)

  const [name, setName] = useState(segment?.name ?? '')
  const [description, setDescription] = useState(segment?.description ?? '')
  const [questions, setQuestions] = useState<QuestionConfig[]>(() => {
    const existing = (segment?.questions as QuestionConfig[] | undefined) ?? []
    if (existing.length > 0) return existing.map((q) => ({ ...q }))
    return [createDefaultQuestion('short_text')]
  })
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    () => questions[0]?.id ?? null
  )
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('short_text')
  const [isSaving, setIsSaving] = useState(false)

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId) || null

  const addQuestion = (type: QuestionType) => {
    const q = createDefaultQuestion(type)
    setQuestions((prev) => [...prev, q])
    setSelectedQuestionId(q.id)
  }

  const importReusableQuestion = (reusableId: string) => {
    const rq = reusableQuestions.find((item) => item.id === reusableId)
    if (!rq) return
    const q = reusableQuestionToFormQuestion(rq)
    setQuestions((prev) => [...prev, q])
    setSelectedQuestionId(q.id)
    toast.success('Pregunta reutilizable agregada al segmento')
  }

  const updateQuestion = (id: string, updates: Partial<QuestionConfig>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)))
  }

  const removeQuestion = (id: string) => {
    setQuestions((prev) => {
      const next = prev.filter((q) => q.id !== id)
      if (selectedQuestionId === id) {
        setSelectedQuestionId(next[0]?.id ?? null)
      }
      return next
    })
  }

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= questions.length) return
    const copy = [...questions]
    const [item] = copy.splice(index, 1)
    copy.splice(target, 0, item)
    setQuestions(copy)
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Escribí un nombre para el segmento')
      return
    }
    if (questions.length === 0) {
      toast.error('Agregá al menos una pregunta al segmento')
      return
    }
    const untitled = questions.find((q) => !q.title.trim())
    if (untitled) {
      setSelectedQuestionId(untitled.id)
      toast.error('Todas las preguntas del segmento deben tener título')
      return
    }

    setIsSaving(true)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      questions,
    }

    if (segment) {
      const { error } = await supabase
        .from('question_segments')
        .update(payload as never)
        .eq('id', segment.id)

      if (error) {
        toast.error('No se pudo actualizar el segmento')
        setIsSaving(false)
        return
      }
      toast.success('Segmento actualizado')
    } else {
      const { error } = await supabase
        .from('question_segments')
        .insert({ ...payload, user_id: userId } as never)

      if (error) {
        toast.error('No se pudo crear el segmento')
        setIsSaving(false)
        return
      }
      toast.success('Segmento creado')
    }

    setIsSaving(false)
    router.push('/segments')
    router.refresh()
  }, [description, name, questions, router, segment, supabase, userId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!isSaving) handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, isSaving])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-slate-600">
            <Link href="/segments">
              <ArrowLeft className="w-4 h-4" />
              Todos los segmentos
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isEditing ? 'Editar segmento reutilizable' : 'Nuevo segmento reutilizable'}
              </h1>
              <p className="text-sm text-slate-600">
                Configurá el grupo de preguntas para reutilizarlo en múltiples formularios.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" asChild>
              <Link href="/segments">Cancelar</Link>
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEditing ? 'Guardar cambios' : 'Crear segmento'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main full-page editor layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Segment info + Questions list */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-5 bg-white border-slate-200 space-y-4">
            <div>
              <Label htmlFor="segment-name">Nombre del segmento</Label>
              <Input
                id="segment-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Datos de contacto, Encuesta de satisfacción..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="segment-description">
                Descripción <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="segment-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describí brevemente para qué se utiliza este segmento..."
                rows={2}
                className="mt-1.5 resize-none"
              />
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                Preguntas del segmento ({questions.length})
              </h2>
            </div>

            <div className="space-y-2.5">
              <div className="flex gap-2">
                <Select
                  value={newQuestionType}
                  onValueChange={(val) => setNewQuestionType(val as QuestionType)}
                >
                  <SelectTrigger className="flex-1">
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
                <Button
                  type="button"
                  onClick={() => addQuestion(newQuestionType)}
                  className="bg-blue-600 hover:bg-blue-700 shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>

              {reusableQuestions.length > 0 && (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-between text-xs font-normal text-slate-600"
                    >
                      <span className="flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                        Importar pregunta reutilizable...
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 max-h-64 overflow-y-auto" align="start">
                    {reusableQuestions.map((rq) => (
                      <DropdownMenuItem
                        key={rq.id}
                        onSelect={() => importReusableQuestion(rq.id)}
                        className="cursor-pointer flex flex-col items-start gap-0.5 py-2"
                      >
                        <span className="font-medium text-sm text-slate-900 truncate w-full">
                          {rq.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          {getQuestionTypeInfo(rq.type)?.label ?? rq.type}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <ScrollArea className="max-h-[420px] pr-1">
              <div className="space-y-2">
                {questions.map((q, index) => {
                  const info = getQuestionTypeInfo(q.type)
                  const isSelected = selectedQuestionId === q.id
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuestionId(q.id)}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-slate-400">
                            {index + 1}.
                          </span>
                          <span className="text-xs text-slate-500">
                            {info?.label ?? q.type}
                          </span>
                          {q.required && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-600 border-red-200">
                              Obligatoria
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {q.title || 'Sin título'}
                        </p>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={index === 0}
                          title="Subir"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveQuestion(index, -1)
                          }}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={index === questions.length - 1}
                          title="Bajar"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveQuestion(index, 1)
                          }}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:text-red-600"
                          title="Eliminar pregunta"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeQuestion(q.id)
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right column: Selected Question Editor */}
        <div className="lg:col-span-7">
          <Card className="bg-white border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm">
                Propiedades de la pregunta seleccionada
              </h2>
              {selectedQuestion && (
                <span className="text-xs text-slate-500">
                  Pregunta {questions.findIndex((q) => q.id === selectedQuestion.id) + 1} de{' '}
                  {questions.length}
                </span>
              )}
            </div>
            {selectedQuestion ? (
              <QuestionEditor
                key={selectedQuestion.id}
                question={selectedQuestion}
                onUpdate={(updates) => updateQuestion(selectedQuestion.id, updates)}
                onDelete={() => removeQuestion(selectedQuestion.id)}
              />
            ) : (
              <div className="py-16 px-6 text-center text-slate-500 text-sm">
                Seleccioná una pregunta de la lista o agregá una nueva para editarla acá.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

