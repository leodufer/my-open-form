'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, ExternalLink, BarChart3, Pencil, Copy, ListChecks, Folder, Check } from 'lucide-react'
import { Form, Collection, FormStatus, QuestionConfig } from '@/lib/database.types'
import { getTheme } from '@/lib/themes'
import { DeleteFormButton } from './delete-form-button'
import { toast } from 'sonner'

interface FormCardProps {
  form: Form
  responseCount: number
  collections?: Collection[]
  collectionName?: string
  onMoveToCollection?: (formId: string, collectionId: string) => void
}

const statusStyles: Record<FormStatus, { label: string; dot: string; text: string }> = {
  published: { label: 'Publicado', dot: 'bg-emerald-500', text: 'text-emerald-700 bg-emerald-50 ring-emerald-600/15' },
  draft: { label: 'Borrador', dot: 'bg-slate-400', text: 'text-slate-600 bg-slate-50 ring-slate-500/15' },
  closed: { label: 'Cerrado', dot: 'bg-amber-500', text: 'text-amber-700 bg-amber-50 ring-amber-600/15' },
}

function formatRelativeDate(date: string) {
  const diffMs = Date.now() - new Date(date).getTime()
  const minutes = Math.round(diffMs / 60000)
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (days < 7) return rtf.format(-days, 'day')
  return new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function FormCard({
  form,
  responseCount,
  collections = [],
  collectionName,
  onMoveToCollection,
}: FormCardProps) {
  const theme = getTheme(form.theme)
  const status = statusStyles[form.status]
  const questionCount = ((form.questions as QuestionConfig[]) || []).length

  const copyFormLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`)
      toast.success('Enlace copiado al portapapeles')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  return (
    <div className="group relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      {/* Theme preview */}
      <Link
        href={`/forms/${form.id}/edit`}
        className="relative block h-28 overflow-hidden rounded-t-xl"
        style={{ backgroundColor: theme.backgroundColor, fontFamily: theme.fontFamily }}
        aria-label={`Editar ${form.title || 'Formulario sin título'}`}
      >
        <div className="absolute inset-x-5 top-5">
          <div className="text-[11px] font-semibold mb-1.5" style={{ color: theme.primaryColor }}>
            1 →
          </div>
          <div className="h-2.5 w-3/4 rounded-full mb-2" style={{ backgroundColor: theme.textColor, opacity: 0.8 }} />
          <div className="h-2 w-1/2 rounded-full mb-4" style={{ backgroundColor: theme.textColor, opacity: 0.25 }} />
          <div className="h-5 w-12 rounded-md" style={{ backgroundColor: theme.primaryColor }} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/forms/${form.id}/edit`}
              className="block truncate font-semibold text-slate-900 transition-colors hover:text-blue-600"
            >
              {form.title || 'Formulario sin título'}
            </Link>
            <p className="mt-0.5 text-xs text-slate-500">Editado {formatRelativeDate(form.updated_at)}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="-mr-2 shrink-0 text-slate-500" aria-label="Acciones del formulario">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/forms/${form.id}/edit`} className="cursor-pointer">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/forms/${form.id}/responses`} className="cursor-pointer">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Respuestas
                </Link>
              </DropdownMenuItem>
              {form.status === 'published' && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/f/${form.slug}`} target="_blank" className="cursor-pointer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir formulario
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyFormLink} className="cursor-pointer">
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar enlace
                  </DropdownMenuItem>
                </>
              )}
              {collections.length > 0 && onMoveToCollection && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <Folder className="mr-2 h-4 w-4" />
                    Mover a colección
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-44">
                    {collections.map((col) => {
                      const isCurrent = (form.collection_id ?? collections[0]?.id) === col.id
                      return (
                        <DropdownMenuItem
                          key={col.id}
                          onClick={() => onMoveToCollection(form.id, col.id)}
                          className="cursor-pointer justify-between"
                        >
                          <span className="truncate">{col.name}</span>
                          {isCurrent && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DeleteFormButton formId={form.id} formTitle={form.title} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${status.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className="inline-flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5" />
            {plural(questionCount, 'pregunta')}
          </span>
          <Link
            href={`/forms/${form.id}/responses`}
            className="inline-flex items-center gap-1 transition-colors hover:text-blue-600"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {plural(responseCount, 'respuesta')}
          </Link>
          {collectionName && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
              <Folder className="h-3 w-3" />
              {collectionName}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
