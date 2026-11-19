'use client'

import { useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@/lib/supabase/client'
import {
  Form,
  Collection,
  QuestionConfig,
  QuestionSegment,
  ReusableQuestion,
  ThemePreset,
  FormStatus,
} from '@/lib/database.types'
import { questionTypes, createDefaultQuestion, getQuestionTypeInfo } from '@/lib/questions'
import {
  formQuestionToReusablePayload,
  reusableQuestionToFormQuestion,
  segmentToFormQuestions,
} from '@/lib/reusable-questions'
import { themes, themeList } from '@/lib/themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Save,
  Globe,
  X,
  ExternalLink,
  Copy,
  Settings,
  Palette,
  FileText,
  Pencil,
  CopyPlus,
  Loader2,
  Check,
  Bookmark,
  Layers,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { QuestionEditor } from './question-editor'
import { FormPreview } from './form-preview'
import { FormPlayer } from '@/components/form-player/form-player'

interface FormBuilderProps {
  form: Form
  collections?: Collection[]
  reusableQuestions?: ReusableQuestion[]
  questionSegments?: QuestionSegment[]
}

export function FormBuilder({
  form: initialForm,
  collections = [],
  reusableQuestions: initialReusableQuestions = [],
  questionSegments = [],
}: FormBuilderProps) {
  const supabase = createClient()
  
  const [form, setForm] = useState(initialForm)
  const [questions, setQuestions] = useState<QuestionConfig[]>(
    (initialForm.questions as QuestionConfig[]) || []
  )
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [activeTab, setActiveTab] = useState('questions')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [reusableQuestions, setReusableQuestions] = useState<ReusableQuestion[]>(initialReusableQuestions)
  const [isSavingReusable, setIsSavingReusable] = useState(false)
  const [addElementTab, setAddElementTab] = useState<'new' | 'reusable' | 'segments'>('new')
  const [reusableSearch, setReusableSearch] = useState('')
  const [segmentSearch, setSegmentSearch] = useState('')

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId)

  const handleSave = useCallback(async () => {
    if (!form.slug) {
      toast.error('La URL del formulario no puede estar vacía')
      setActiveTab('settings')
      return
    }
    setIsSaving(true)
    const updateData = {
      title: form.title,
      description: form.description,
      slug: form.slug,
      theme: form.theme,
      collection_id: form.collection_id,
      questions: questions,
      thank_you_message: form.thank_you_message,
      allow_multiple_submissions: Boolean(form.allow_multiple_submissions),
    }
    const { error } = await supabase
      .from('forms')
      .update(updateData as never)
      .eq('id', form.id)

    if (error) {
      toast.error(error.code === '23505' ? 'Esa URL ya está en uso' : 'No se pudo guardar el formulario')
    } else {
      toast.success('Formulario guardado')
      setHasUnsavedChanges(false)
    }
    setIsSaving(false)
  }, [supabase, form, questions])

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

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handlePublish = async () => {
    if (questions.length === 0 && form.status !== 'published') {
      toast.error('Agregá al menos una pregunta antes de publicar')
      return
    }
    if (!form.slug) {
      toast.error('La URL del formulario no puede estar vacía')
      return
    }

    setIsSaving(true)
    const newStatus: FormStatus = form.status === 'published' ? 'closed' : 'published'
    
    const updateData = {
      status: newStatus,
      questions: questions,
      title: form.title,
      description: form.description,
      slug: form.slug,
      theme: form.theme,
      collection_id: form.collection_id,
      thank_you_message: form.thank_you_message,
      allow_multiple_submissions: Boolean(form.allow_multiple_submissions),
    }
    const { error } = await supabase
      .from('forms')
      .update(updateData as never)
      .eq('id', form.id)

    if (error) {
      toast.error(error.code === '23505' ? 'Esa URL ya está en uso' : 'No se pudo actualizar el estado del formulario')
    } else {
      setForm({ ...form, status: newStatus })
      toast.success(newStatus === 'published' ? '¡Formulario publicado!' : 'Formulario despublicado')
      setShowPublishDialog(false)
      setHasUnsavedChanges(false)
    }
    setIsSaving(false)
  }

  const addQuestion = (type: QuestionConfig['type']) => {
    const newQuestion = createDefaultQuestion(type)
    setQuestions([...questions, newQuestion])
    setSelectedQuestionId(newQuestion.id)
    setShowAddQuestion(false)
    setHasUnsavedChanges(true)
  }

  const addReusableQuestion = (reusable: ReusableQuestion) => {
    const newQuestion = reusableQuestionToFormQuestion(reusable)
    setQuestions([...questions, newQuestion])
    setSelectedQuestionId(newQuestion.id)
    setShowAddQuestion(false)
    setHasUnsavedChanges(true)
    toast.success('Pregunta reutilizable agregada al formulario')
  }

  const addQuestionSegment = (segment: QuestionSegment) => {
    const segmentQuestions = segmentToFormQuestions(segment)
    if (segmentQuestions.length === 0) {
      toast.error('Este segmento no tiene preguntas')
      return
    }
    setQuestions([...questions, ...segmentQuestions])
    setSelectedQuestionId(segmentQuestions[0].id)
    setShowAddQuestion(false)
    setHasUnsavedChanges(true)
    toast.success(`Segmento agregado (${segmentQuestions.length} ${segmentQuestions.length === 1 ? 'pregunta' : 'preguntas'})`)
  }

  const saveQuestionAsReusable = async (question: QuestionConfig) => {
    if (!question.title.trim()) {
      toast.error('Escribí el título de la pregunta antes de guardarla como reutilizable')
      return
    }
    setIsSavingReusable(true)
    const payload = formQuestionToReusablePayload(question, form.user_id)
    const { data, error } = await supabase
      .from('reusable_questions')
      .insert(payload as never)
      .select('*')
      .single()

    if (error || !data) {
      toast.error('No se pudo guardar la pregunta como reutilizable')
    } else {
      const saved = data as ReusableQuestion
      setReusableQuestions([saved, ...reusableQuestions])
      updateQuestion(question.id, { reusableQuestionId: saved.id })
      toast.success('Pregunta guardada en tu biblioteca de reutilizables')
    }
    setIsSavingReusable(false)
  }

  const updateQuestion = (id: string, updates: Partial<QuestionConfig>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ))
    setHasUnsavedChanges(true)
  }

  const duplicateQuestion = (id: string) => {
    const index = questions.findIndex(q => q.id === id)
    if (index === -1) return
    const copy = { ...questions[index], id: uuidv4() }
    setQuestions([...questions.slice(0, index + 1), copy, ...questions.slice(index + 1)])
    setSelectedQuestionId(copy.id)
    setHasUnsavedChanges(true)
  }

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
    if (selectedQuestionId === id) {
      setSelectedQuestionId(null)
    }
    setHasUnsavedChanges(true)
  }

  const handleReorder = (newOrder: QuestionConfig[]) => {
    setQuestions(newOrder)
    setHasUnsavedChanges(true)
  }

  const copyFormLink = async () => {
    const link = `${window.location.origin}/f/${form.slug}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Enlace copiado al portapapeles')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  const currentTheme = themes[form.theme as ThemePreset] || themes.minimal

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-4 px-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="group relative flex items-center">
            <Input
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value })
                setHasUnsavedChanges(true)
              }}
              className="text-lg font-semibold border-0 border-b-2 border-transparent bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-blue-500 hover:border-slate-300 px-1 pr-7 max-w-xs transition-colors"
              placeholder="Formulario sin título"
            />
            <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-0 transition-opacity pointer-events-none" />
          </div>
          {form.status === 'published' && (
            <Badge className="bg-emerald-100 text-emerald-700">Publicado</Badge>
          )}
          {form.status === 'draft' && (
            <Badge variant="secondary">Borrador</Badge>
          )}
          {form.status === 'closed' && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">Cerrado</Badge>
          )}
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
            {hasUnsavedChanges ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Cambios sin guardar
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Todo guardado
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {form.status === 'published' && (
            <>
              <Button variant="ghost" size="sm" onClick={copyFormLink} title="Copiar enlace">
                <Copy className="w-4 h-4" />
                <span className="hidden lg:inline">Copiar enlace</span>
              </Button>
              <Button variant="ghost" size="sm" asChild title="Abrir formulario público">
                <Link href={`/f/${form.slug}`} target="_blank">
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden lg:inline">Ver</span>
                </Link>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullPreview(true)}
            disabled={questions.length === 0}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Vista previa</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            title="Guardar (⌘S)"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">Guardar</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowPublishDialog(true)}
            className={form.status === 'published' 
              ? 'bg-amber-500 hover:bg-amber-600' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
            }
          >
            <Globe className="w-4 h-4" />
            {form.status === 'published' ? 'Despublicar' : 'Publicar'}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col overflow-hidden">
            <div className="shrink-0 p-2 border-b border-slate-100">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="questions" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Preguntas
                </TabsTrigger>
                <TabsTrigger value="design" className="text-xs">
                  <Palette className="w-3 h-3 mr-1" />
                  Diseño
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Ajustes
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="questions" className="flex-1 flex flex-col mt-0 overflow-hidden data-[state=inactive]:hidden">
              <div className="shrink-0 p-4 border-b border-slate-100">
                <Button 
                  onClick={() => setShowAddQuestion(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar elemento
                </Button>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {questions.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">Todavía no hay preguntas</p>
                      <p className="text-xs text-slate-400 mt-1">Agregá tu primer elemento para comenzar</p>
                    </div>
                  ) : (
                    <Reorder.Group axis="y" values={questions} onReorder={handleReorder}>
                      <AnimatePresence>
                        {questions.map((question, index) => (
                          <Reorder.Item key={question.id} value={question}>
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={`
                                group p-3 rounded-lg cursor-pointer mb-2 border transition-all
                                ${selectedQuestionId === question.id 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'bg-white border-slate-100 hover:border-slate-200'
                                }
                              `}
                              onClick={() => setSelectedQuestionId(question.id)}
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-1 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4 text-slate-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-slate-400">
                                      {index + 1}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {questionTypes.find(qt => qt.type === question.type)?.label ?? question.type}
                                    </span>
                                    {question.required && (
                                      <span className="text-xs text-red-500">*</span>
                                    )}
                                    {question.reusableQuestionId && (
                                      <Bookmark className="w-3 h-3 text-blue-600 shrink-0" aria-label="Pregunta reutilizable" />
                                    )}
                                    {question.segmentId && (
                                      <Layers className="w-3 h-3 text-indigo-600 shrink-0" aria-label="Segmento reutilizable" />
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-slate-900 truncate">
                                    {question.title || 'Sin título'}
                                  </p>
                                </div>
                                <div className="flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    aria-label="Duplicar"
                                    title="Duplicar"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      duplicateQuestion(question.id)
                                    }}
                                  >
                                    <CopyPlus className="w-4 h-4 text-slate-400" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:text-red-500"
                                    aria-label="Eliminar"
                                    title="Eliminar"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteQuestion(question.id)
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-slate-400" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          </Reorder.Item>
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="design" className="flex-1 mt-0 overflow-auto data-[state=inactive]:hidden">
              <div className="p-4 space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Tema</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {themeList.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setForm({ ...form, theme: theme.id })
                          setHasUnsavedChanges(true)
                        }}
                        className={`
                          p-3 rounded-lg border-2 transition-all text-left
                          ${form.theme === theme.id 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : 'border-slate-200 hover:border-slate-300'
                          }
                        `}
                      >
                        <div 
                          className="w-full h-8 rounded mb-2"
                          style={{ backgroundColor: theme.backgroundColor }}
                        >
                          <div 
                            className="w-1/2 h-full rounded-l flex items-center justify-center"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 mt-0 overflow-auto data-[state=inactive]:hidden">
              <div className="p-4 space-y-6">
                {collections.length > 0 && (
                  <div>
                    <Label htmlFor="collection" className="text-sm font-medium">Colección</Label>
                    <Select
                      value={form.collection_id ?? collections[0]?.id}
                      onValueChange={(value) => {
                        setForm({ ...form, collection_id: value })
                        setHasUnsavedChanges(true)
                      }}
                    >
                      <SelectTrigger id="collection" className="mt-2 w-full">
                        <SelectValue placeholder="Seleccionar colección" />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="slug" className="text-sm font-medium">URL del formulario</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-slate-500">/f/</span>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => {
                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        setForm({ ...form, slug })
                        setHasUnsavedChanges(true)
                      }}
                      className="flex-1"
                      placeholder="mi-formulario"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium">Descripción</Label>
                  <Textarea
                    id="description"
                    value={form.description || ''}
                    onChange={(e) => {
                      setForm({ ...form, description: e.target.value })
                      setHasUnsavedChanges(true)
                    }}
                    className="mt-2"
                    placeholder="Descripción opcional del formulario..."
                    rows={3}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Si está definida, se muestra una pantalla de bienvenida con el título y la descripción antes de la primera pregunta.
                  </p>
                </div>

                <div>
                  <Label htmlFor="thank_you" className="text-sm font-medium">Mensaje de agradecimiento</Label>
                  <Textarea
                    id="thank_you"
                    value={form.thank_you_message}
                    onChange={(e) => {
                      setForm({ ...form, thank_you_message: e.target.value })
                      setHasUnsavedChanges(true)
                    }}
                    className="mt-2"
                    placeholder="¡Gracias por tu respuesta!"
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="allow_multiple" className="text-sm font-medium">
                      Permitir múltiples respuestas
                    </Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Permite completar el formulario más de una vez y muestra un botón al final para cargar otra respuesta.
                    </p>
                  </div>
                  <Switch
                    id="allow_multiple"
                    checked={Boolean(form.allow_multiple_submissions)}
                    onCheckedChange={(checked) => {
                      setForm({ ...form, allow_multiple_submissions: checked })
                      setHasUnsavedChanges(true)
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Preview / Editor area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Question Editor */}
          {selectedQuestion && (
            <div className="w-96 bg-white border-r border-slate-200 overflow-auto">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-medium">Editar elemento</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedQuestionId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <QuestionEditor
                question={selectedQuestion}
                onUpdate={(updates) => updateQuestion(selectedQuestion.id, updates)}
                onDelete={() => deleteQuestion(selectedQuestion.id)}
                onSaveAsReusable={() => saveQuestionAsReusable(selectedQuestion)}
                isSavingReusable={isSavingReusable}
              />
            </div>
          )}

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-slate-100 p-8">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">Vista previa</span>
                </div>
                <div 
                  className="min-h-[500px]"
                  style={{ 
                    backgroundColor: currentTheme.backgroundColor,
                    fontFamily: currentTheme.fontFamily 
                  }}
                >
                  <FormPreview 
                    questions={questions}
                    theme={currentTheme}
                    selectedQuestionId={selectedQuestionId}
                    onSelectQuestion={setSelectedQuestionId}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFullPreview && (
          <FullScreenPreview
            onClose={() => setShowFullPreview(false)}
            form={{ ...form, questions }}
          />
        )}
      </AnimatePresence>

      {/* Add Question Dialog */}
      <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar elemento</DialogTitle>
            <DialogDescription>
              Elegí un tipo de elemento nuevo o insertá una pregunta reutilizable de tu biblioteca
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={addElementTab}
            onValueChange={(val) => setAddElementTab(val as 'new' | 'reusable' | 'segments')}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="new">Nuevos elementos</TabsTrigger>
              <TabsTrigger value="reusable" className="gap-1.5">
                <Bookmark className="w-3.5 h-3.5" />
                Reutilizables ({reusableQuestions.length})
              </TabsTrigger>
              <TabsTrigger value="segments" className="gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Segmentos ({questionSegments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-1">
                {questionTypes.map((qt) => (
                  <button
                    key={qt.type}
                    onClick={() => addQuestion(qt.type)}
                    className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                  >
                    <qt.icon className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-2" />
                    <p className="font-medium text-sm text-slate-900">{qt.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{qt.description}</p>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reusable" className="mt-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={reusableSearch}
                  onChange={(e) => setReusableSearch(e.target.value)}
                  placeholder="Buscar en tus preguntas reutilizables..."
                  className="pl-9"
                />
              </div>
              <div className="max-h-[48vh] overflow-y-auto space-y-2 pr-1">
                {reusableQuestions.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed rounded-lg">
                    <Bookmark className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-600">No tenés preguntas reutilizables todavía</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Podés crearlas en la sección Preguntas o guardar cualquier pregunta desde el editor.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/questions">Ir a Preguntas reutilizables</Link>
                    </Button>
                  </div>
                ) : (
                  reusableQuestions
                    .filter((rq) =>
                      !reusableSearch.trim() ||
                      rq.title.toLowerCase().includes(reusableSearch.toLowerCase()) ||
                      (rq.description || '').toLowerCase().includes(reusableSearch.toLowerCase())
                    )
                    .map((rq) => {
                      const info = getQuestionTypeInfo(rq.type)
                      const Icon = info?.icon || FileText
                      const alreadyInForm = questions.some((q) => q.reusableQuestionId === rq.id)
                      return (
                        <button
                          key={rq.id}
                          onClick={() => addReusableQuestion(rq)}
                          className="w-full p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left flex items-start justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Icon className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-slate-900 truncate">{rq.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {info?.label ?? rq.type}
                                {rq.description ? ` · ${rq.description}` : ''}
                              </p>
                            </div>
                          </div>
                          {alreadyInForm && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              Ya en el formulario
                            </Badge>
                          )}
                        </button>
                      )
                    })
                )}
              </div>
            </TabsContent>

            <TabsContent value="segments" className="mt-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={segmentSearch}
                  onChange={(e) => setSegmentSearch(e.target.value)}
                  placeholder="Buscar en tus segmentos reutilizables..."
                  className="pl-9"
                />
              </div>
              <div className="max-h-[48vh] overflow-y-auto space-y-2 pr-1">
                {questionSegments.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed rounded-lg">
                    <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-600">No tenés segmentos reutilizables todavía</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Podés crear segmentos con varias preguntas en la sección Segmentos.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/segments">Ir a Segmentos</Link>
                    </Button>
                  </div>
                ) : (
                  questionSegments
                    .filter((seg) =>
                      !segmentSearch.trim() ||
                      seg.name.toLowerCase().includes(segmentSearch.toLowerCase()) ||
                      (seg.description || '').toLowerCase().includes(segmentSearch.toLowerCase())
                    )
                    .map((seg) => {
                      const segQuestions = (seg.questions as QuestionConfig[]) || []
                      const alreadyInForm = questions.some((q) => q.segmentId === seg.id)
                      return (
                        <button
                          key={seg.id}
                          onClick={() => addQuestionSegment(seg)}
                          className="w-full p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/60 transition-all text-left flex items-start justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Layers className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-slate-900 truncate">{seg.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {segQuestions.length}{' '}
                                {segQuestions.length === 1 ? 'pregunta' : 'preguntas'}
                                {seg.description ? ` · ${seg.description}` : ''}
                              </p>
                            </div>
                          </div>
                          {alreadyInForm && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              Ya en el formulario
                            </Badge>
                          )}
                        </button>
                      )
                    })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.status === 'published' ? '¿Despublicar formulario?' : '¿Publicar formulario?'}
            </DialogTitle>
            <DialogDescription>
              {form.status === 'published' 
                ? 'El formulario dejará de estar disponible para responder. Las respuestas existentes se conservarán.'
                : 'Tu formulario estará disponible en:'
              }
            </DialogDescription>
          </DialogHeader>
          {form.status !== 'published' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <code className="text-sm text-blue-600 break-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}/f/{form.slug}
              </code>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePublish}
              disabled={isSaving}
              className={form.status === 'published' 
                ? 'bg-amber-500 hover:bg-amber-600' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
              }
            >
              {isSaving ? 'Guardando...' : form.status === 'published' ? 'Despublicar' : 'Publicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FullScreenPreview({
  form,
  onClose,
}: {
  form: React.ComponentProps<typeof FormPlayer>['form']
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Form preview"
    >
      <FormPlayer form={form} preview />
      <Button
        variant="secondary"
        size="sm"
        onClick={onClose}
        className="fixed top-3 right-3 z-[60] shadow-md"
      >
        <X className="w-4 h-4" />
        Cerrar vista previa
      </Button>
    </motion.div>
  )
}
