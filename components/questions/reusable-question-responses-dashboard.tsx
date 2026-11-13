'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Collection,
  Form,
  Json,
  QuestionConfig,
  Response as FormResponse,
  ReusableQuestion,
} from '@/lib/database.types'
import { getQuestionTypeInfo } from '@/lib/questions'
import { formatReusableAnswer } from '@/lib/reusable-questions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Bookmark,
  Download,
  ExternalLink,
  Eye,
  File,
  FileText,
  Folder,
  Image as ImageIcon,
  MoreVertical,
  Search,
  Trash2,
} from 'lucide-react'

interface ReusableQuestionResponsesDashboardProps {
  question: ReusableQuestion
  forms: Pick<Form, 'id' | 'title' | 'slug' | 'status' | 'questions' | 'collection_id'>[]
  collections: Collection[]
  responses: Pick<FormResponse, 'id' | 'form_id' | 'answers' | 'submitted_at'>[]
}

interface FileUpload {
  name: string
  type: string
  size?: number
  data?: string
  url?: string
}

interface ConsolidatedRow {
  responseId: string
  formId: string
  formTitle: string
  formSlug: string
  collectionName: string
  answer: Json
  formattedAnswer: string
  submittedAt: string
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('es-AR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isFileUpload(answer: Json): boolean {
  if (answer === null || typeof answer !== 'object' || Array.isArray(answer)) {
    return false
  }
  const obj = answer as Record<string, unknown>
  return (
    'name' in obj &&
    typeof obj.name === 'string' &&
    (('url' in obj && typeof obj.url === 'string') ||
      ('data' in obj && typeof obj.data === 'string'))
  )
}

function asFileUpload(answer: Json): FileUpload {
  return answer as unknown as FileUpload
}

function getFileUrl(file: FileUpload): string {
  return file.url || file.data || ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function ReusableQuestionResponsesDashboard({
  question,
  forms,
  collections,
  responses: initialResponses,
}: ReusableQuestionResponsesDashboardProps) {
  const supabase = createClient()
  const typeInfo = getQuestionTypeInfo(question.type)
  const TypeIcon = typeInfo?.icon || FileText

  const [responses, setResponses] = useState(initialResponses)
  const [searchQuery, setSearchQuery] = useState('')
  const [formFilterId, setFormFilterId] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [filePreview, setFilePreview] = useState<FileUpload | null>(null)

  const collectionMap = useMemo(() => {
    const map = new Map<string, string>()
    collections.forEach((c) => map.set(c.id, c.name))
    return map
  }, [collections])

  const { usedForms, allRows } = useMemo(() => {
    const used: Pick<Form, 'id' | 'title' | 'slug' | 'status' | 'collection_id'>[] = []
    const questionIdsByForm = new Map<string, string[]>()

    for (const form of forms) {
      const formQuestions = (form.questions as QuestionConfig[]) || []
      const matchingIds = formQuestions
        .filter((q) => q.reusableQuestionId === question.id)
        .map((q) => q.id)
      if (matchingIds.length > 0) {
        used.push(form)
        questionIdsByForm.set(form.id, matchingIds)
      }
    }

    const formById = new Map(used.map((f) => [f.id, f]))
    const rows: ConsolidatedRow[] = []

    for (const resp of responses) {
      const qIds = questionIdsByForm.get(resp.form_id)
      const form = formById.get(resp.form_id)
      if (!qIds || !form) continue

      const answers = (resp.answers || {}) as Record<string, Json>
      const collectionName = form.collection_id
        ? collectionMap.get(form.collection_id) || 'General'
        : 'General'

      for (const qId of qIds) {
        const answer = answers[qId]
        if (answer === undefined) continue
        rows.push({
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

    return { usedForms: used, allRows: rows }
  }, [forms, responses, question.id, collectionMap])

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (formFilterId !== 'all' && row.formId !== formFilterId) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          row.formattedAnswer.toLowerCase().includes(q) ||
          row.formTitle.toLowerCase().includes(q) ||
          row.collectionName.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allRows, formFilterId, searchQuery])

  const handleDelete = async () => {
    if (!responseToDelete) return

    setIsDeleting(true)
    const { error } = await supabase
      .from('responses')
      .delete()
      .eq('id', responseToDelete)

    if (error) {
      toast.error('No se pudo eliminar la respuesta')
    } else {
      setResponses((prev) => prev.filter((r) => r.id !== responseToDelete))
      toast.success('Respuesta eliminada')
    }
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setResponseToDelete(null)
  }

  const exportToCSV = () => {
    if (filteredRows.length === 0) {
      toast.error('No hay respuestas para exportar')
      return
    }

    const headers = ['Fecha', 'Formulario', 'Colección', question.title || 'Respuesta']
    const csvRows = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...filteredRows.map((row) =>
        [
          formatDate(row.submittedAt),
          row.formTitle,
          row.collectionName,
          row.formattedAnswer,
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const safeTitle = (question.title || 'pregunta')
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .slice(0, 40)
    link.download = `${safeTitle}-respuestas-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('CSV exportado correctamente')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-slate-600">
            <Link href="/questions">
              <ArrowLeft className="w-4 h-4" />
              Todas las preguntas reutilizables
            </Link>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {question.title}
              </h1>
              <Badge variant="secondary" className="gap-1.5 font-normal">
                <TypeIcon className="w-3.5 h-3.5 text-blue-600" />
                {typeInfo?.label ?? question.type}
              </Badge>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                <Bookmark className="w-3 h-3" />
                Reutilizable
              </Badge>
              {question.required && (
                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                  Obligatoria
                </Badge>
              )}
            </div>
            {question.description && (
              <p className="text-slate-600 mt-1">{question.description}</p>
            )}
            <p className="text-slate-600 mt-1 text-sm">
              {allRows.length} {allRows.length === 1 ? 'respuesta' : 'respuestas'} en{' '}
              {usedForms.length} {usedForms.length === 1 ? 'formulario' : 'formularios'}
            </p>
          </div>
        </div>
      </div>

      {/* Responses section */}
      {allRows.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Todavía no hay respuestas</h2>
          <p className="text-slate-600 max-w-md mx-auto">
            {usedForms.length > 0
              ? 'Esta pregunta está agregada a tus formularios, pero aún no recibió respuestas.'
              : 'Agregá esta pregunta reutilizable a uno o más formularios para empezar a recolectar respuestas.'}
          </p>
          <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700">
            <Link href="/questions">Volver a preguntas reutilizables</Link>
          </Button>
        </Card>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar respuestas o formularios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <Select value={formFilterId} onValueChange={setFormFilterId}>
                <SelectTrigger className="w-full sm:w-64 bg-white">
                  <SelectValue placeholder="Filtrar por formulario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos los formularios ({usedForms.length})
                  </SelectItem>
                  {usedForms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px] sticky left-0 bg-white z-10 pl-6">
                      Fecha
                    </TableHead>
                    <TableHead className="min-w-[240px]">Formulario de origen</TableHead>
                    <TableHead className="min-w-[320px]">
                      {question.title || 'Respuesta'}
                    </TableHead>
                    <TableHead className="w-[60px] sticky right-0 bg-white z-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={`${row.responseId}-${row.formId}`}>
                      <TableCell className="font-medium sticky left-0 bg-white z-10 pl-6 whitespace-nowrap">
                        {formatDate(row.submittedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/forms/${row.formId}/responses`}
                            className="font-medium text-blue-600 hover:underline inline-flex items-center gap-1.5"
                          >
                            <span>{row.formTitle}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </Link>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Folder className="w-3 h-3" />
                            {row.collectionName}
                          </span>
                        </div>
                      </TableCell>
                      {isFileUpload(row.answer) ? (
                        (() => {
                          const file = asFileUpload(row.answer)
                          const isImage = file.type?.startsWith('image/')
                          return (
                            <TableCell className="max-w-[360px]">
                              <button
                                onClick={() => setFilePreview(file)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-sm group"
                              >
                                {isImage ? (
                                  <ImageIcon className="w-4 h-4" />
                                ) : (
                                  <File className="w-4 h-4" />
                                )}
                                <span className="truncate max-w-[200px]">{file.name}</span>
                                <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </TableCell>
                          )
                        })()
                      ) : (
                        <TableCell className="max-w-[420px] whitespace-pre-wrap break-words text-slate-900">
                          {row.formattedAnswer}
                        </TableCell>
                      )}
                      <TableCell className="sticky right-0 bg-white z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/forms/${row.formId}/responses`}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver respuestas del formulario
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setResponseToDelete(row.responseId)
                                setDeleteDialogOpen(true)
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar respuesta
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Card>

          {filteredRows.length === 0 && (searchQuery || formFilterId !== 'all') && (
            <div className="text-center py-12">
              <p className="text-slate-500">No hay respuestas que coincidan con los filtros actuales</p>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar respuesta</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar esta respuesta del formulario? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File preview dialog */}
      <Dialog open={!!filePreview} onOpenChange={() => setFilePreview(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {filePreview?.type?.startsWith('image/') ? (
                <ImageIcon className="w-5 h-5 text-blue-600" />
              ) : (
                <File className="w-5 h-5 text-blue-600" />
              )}
              <span className="truncate">{filePreview?.name}</span>
            </DialogTitle>
            <DialogDescription>
              {filePreview?.size ? formatFileSize(filePreview.size) + ' • ' : ''}
              {filePreview?.type}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0 mt-4">
            {filePreview?.type?.startsWith('image/') ? (
              <img
                src={getFileUrl(filePreview)}
                alt={filePreview.name}
                className="max-w-full h-auto rounded-lg mx-auto"
              />
            ) : filePreview?.type === 'application/pdf' ? (
              <iframe
                src={getFileUrl(filePreview)}
                className="w-full h-[60vh] rounded-lg border"
                title={filePreview.name}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <File className="w-16 h-16 mb-4 opacity-50" />
                <p>Vista previa no disponible para este tipo de archivo</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setFilePreview(null)}>
              Cerrar
            </Button>
            {filePreview?.url ? (
              <a
                href={filePreview.url}
                target="_blank"
                rel="noopener noreferrer"
                download={filePreview.name}
              >
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </a>
            ) : (
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  if (filePreview?.data) {
                    const link = document.createElement('a')
                    link.href = filePreview.data
                    link.download = filePreview.name
                    link.click()
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

