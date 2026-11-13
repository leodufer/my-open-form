'use client'

import { useEffect, useState } from 'react'
import { SharePermission, ShareResourceType } from '@/lib/database.types'
import { ShareEntry } from '@/app/api/shares/route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Loader2, Share2, Trash2, UserPlus, Users } from 'lucide-react'

interface ShareResourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceType: ShareResourceType
  resourceId: string
  resourceTitle: string
}

const RESOURCE_LABEL: Record<ShareResourceType, string> = {
  form: 'formulario',
  reusable_question: 'pregunta reutilizable',
  question_segment: 'segmento reutilizable',
}

export function ShareResourceDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceTitle,
}: ShareResourceDialogProps) {
  const [shares, setShares] = useState<ShareEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<SharePermission>('edit')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !resourceId) return
    let cancelled = false
    setIsLoading(true)

    fetch(
      `/api/shares?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`
    )
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los accesos')
        if (!cancelled) setShares(data.shares || [])
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Error al cargar accesos')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, resourceId, resourceType])

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      toast.error('Ingresá un correo electrónico válido')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType,
          resourceId,
          email: email.trim(),
          permission,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo compartir')
      } else {
        const created = data.share as ShareEntry
        setShares((prev) => {
          const exists = prev.some((s) => s.id === created.id)
          if (exists) {
            return prev.map((s) => (s.id === created.id ? created : s))
          }
          return [created, ...prev]
        })
        setEmail('')
        toast.success(`Compartido con ${created.email}`)
      }
    } catch {
      toast.error('Error de red al compartir')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePermission = async (shareId: string, nextPermission: SharePermission) => {
    try {
      const res = await fetch(`/api/shares/${shareId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: nextPermission }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo actualizar el permiso')
      } else {
        setShares((prev) =>
          prev.map((s) => (s.id === shareId ? { ...s, permission: nextPermission } : s))
        )
        toast.success('Permiso actualizado')
      }
    } catch {
      toast.error('Error de red al actualizar permiso')
    }
  }

  const handleRevoke = async (shareId: string, recipientEmail: string) => {
    try {
      const res = await fetch(`/api/shares/${shareId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo quitar el acceso')
      } else {
        setShares((prev) => prev.filter((s) => s.id !== shareId))
        toast.success(`Acceso revocado para ${recipientEmail}`)
      }
    } catch {
      toast.error('Error de red al revocar acceso')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Compartir {RESOURCE_LABEL[resourceType]}
          </DialogTitle>
          <DialogDescription className="truncate">
            {resourceTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleShare} className="space-y-3 pt-1">
          <Label htmlFor="share-email">Correo del usuario</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              className="flex-1"
              required
            />
            <Select
              value={permission}
              onValueChange={(val) => setPermission(val as SharePermission)}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edit">Puede editar</SelectItem>
                <SelectItem value="view">Solo ver</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Compartir
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="border-t border-slate-100 pt-4 mt-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Personas con acceso ({shares.length})
          </p>

          {isLoading ? (
            <div className="py-6 flex items-center justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando accesos...
            </div>
          ) : shares.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              Todavía no compartiste este recurso con nadie.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {shares.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {s.fullName || s.email}
                    </p>
                    {s.fullName && (
                      <p className="text-xs text-slate-500 truncate">{s.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Select
                      value={s.permission}
                      onValueChange={(val) =>
                        handleUpdatePermission(s.id, val as SharePermission)
                      }
                    >
                      <SelectTrigger className="h-8 w-32 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="edit">Puede editar</SelectItem>
                        <SelectItem value="view">Solo ver</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:text-red-600"
                      title="Quitar acceso"
                      onClick={() => handleRevoke(s.id, s.email)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

