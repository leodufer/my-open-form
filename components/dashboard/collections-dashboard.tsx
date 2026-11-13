'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Collection, Form } from '@/lib/database.types'
import { DEFAULT_COLLECTION_NAME } from '@/lib/collections'
import { FormCard } from './form-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileText, FolderPlus, Folder, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface CollectionsDashboardProps {
  initialForms: Form[]
  initialCollections: Collection[]
  defaultCollectionId: string
  responseCounts: Record<string, number>
  userId: string
}

export function CollectionsDashboard({
  initialForms,
  initialCollections,
  defaultCollectionId,
  responseCounts,
  userId,
}: CollectionsDashboardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [forms, setForms] = useState<Form[]>(initialForms)
  const [collections, setCollections] = useState<Collection[]>(initialCollections)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const collectionMap = useMemo(
    () => new Map(collections.map((c) => [c.id, c])),
    [collections]
  )

  const getEffectiveCollectionId = (form: Form) =>
    form.collection_id && collectionMap.has(form.collection_id)
      ? form.collection_id
      : defaultCollectionId

  const filteredForms = useMemo(() => {
    if (selectedCollectionId === 'all') return forms
    return forms.filter((f) => getEffectiveCollectionId(f) === selectedCollectionId)
  }, [forms, selectedCollectionId, collectionMap, defaultCollectionId])

  const countByCollection = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of forms) {
      const cid = getEffectiveCollectionId(f)
      counts.set(cid, (counts.get(cid) || 0) + 1)
    }
    return counts
  }, [forms, collectionMap, defaultCollectionId])

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newCollectionName.trim()
    if (!trimmed) {
      toast.error('Ingresá un nombre para la colección')
      return
    }

    setIsCreating(true)
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: userId, name: trimmed } as never)
      .select()
      .single()

    setIsCreating(false)

    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Ya existe una colección con ese nombre'
          : 'No se pudo crear la colección'
      )
      return
    }

    const created = data as Collection
    setCollections((prev) => [...prev, created])
    setSelectedCollectionId(created.id)
    setNewCollectionName('')
    setShowCreateDialog(false)
    toast.success(`Colección "${created.name}" creada`)
    router.refresh()
  }

  const handleDeleteCollection = async (collection: Collection) => {
    if (collection.name.toLowerCase() === DEFAULT_COLLECTION_NAME.toLowerCase()) {
      return
    }

    // Reassign forms in this collection to General before deleting
    const affectedIds = forms
      .filter((f) => f.collection_id === collection.id)
      .map((f) => f.id)

    if (affectedIds.length > 0) {
      await supabase
        .from('forms')
        .update({ collection_id: defaultCollectionId } as never)
        .in('id', affectedIds)
    }

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collection.id)

    if (error) {
      toast.error('No se pudo eliminar la colección')
      return
    }

    setForms((prev) =>
      prev.map((f) =>
        f.collection_id === collection.id
          ? { ...f, collection_id: defaultCollectionId }
          : f
      )
    )
    setCollections((prev) => prev.filter((c) => c.id !== collection.id))
    if (selectedCollectionId === collection.id) {
      setSelectedCollectionId('all')
    }
    toast.success(`Colección "${collection.name}" eliminada`)
    router.refresh()
  }

  const handleMoveToCollection = async (formId: string, collectionId: string) => {
    const { error } = await supabase
      .from('forms')
      .update({ collection_id: collectionId } as never)
      .eq('id', formId)

    if (error) {
      toast.error('No se pudo mover el formulario')
      return
    }

    setForms((prev) =>
      prev.map((f) => (f.id === formId ? { ...f, collection_id: collectionId } : f))
    )
    const targetName = collectionMap.get(collectionId)?.name ?? DEFAULT_COLLECTION_NAME
    toast.success(`Movido a "${targetName}"`)
    router.refresh()
  }

  const selectedCollection = collectionMap.get(selectedCollectionId)

  return (
    <>
      {/* Collection filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCollectionId('all')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selectedCollectionId === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todas
            <span className="text-xs opacity-75">({forms.length})</span>
          </button>

          {collections.map((col) => {
            const isSelected = selectedCollectionId === col.id
            const isDefault =
              col.name.toLowerCase() === DEFAULT_COLLECTION_NAME.toLowerCase()
            const count = countByCollection.get(col.id) || 0

            return (
              <div key={col.id} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  {col.name}
                  <span className="text-xs opacity-75">({count})</span>
                </button>
                {isSelected && !isDefault && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCollection(col)}
                    title={`Eliminar colección "${col.name}"`}
                    className="ml-1 p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="bg-white"
        >
          <FolderPlus className="w-4 h-4 mr-1.5" />
          Nueva colección
        </Button>
      </div>

      {/* Forms grid or empty state */}
      {forms.length === 0 ? (
        <Card className="px-6 py-16 sm:p-16 text-center border-dashed border-2 border-slate-200 bg-white shadow-none">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
            <FileText className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Creá tu primer formulario</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
            Creá formularios que la gente disfrute completar, una pregunta a la vez.
          </p>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Link href="/forms/new">
              <Plus className="w-4 h-4" />
              Crear formulario
            </Link>
          </Button>
        </Card>
      ) : filteredForms.length === 0 ? (
        <Card className="px-6 py-12 text-center border-dashed border-2 border-slate-200 bg-white shadow-none">
          <Folder className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            No hay formularios en &quot;{selectedCollection?.name}&quot;
          </h3>
          <p className="text-sm text-slate-500">
            Podés mover cualquier formulario a esta colección desde su menú de opciones o desde Ajustes.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map((form) => {
            const colId = getEffectiveCollectionId(form)
            const colName = collectionMap.get(colId)?.name ?? DEFAULT_COLLECTION_NAME
            return (
              <FormCard
                key={form.id}
                form={form}
                responseCount={responseCounts[form.id] || 0}
                collections={collections}
                collectionName={colName}
                onMoveToCollection={handleMoveToCollection}
              />
            )
          })}
        </div>
      )}

      {/* Create collection dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateCollection}>
            <DialogHeader>
              <DialogTitle>Nueva colección</DialogTitle>
              <DialogDescription>
                Creá una colección para organizar y agrupar tus formularios.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="collectionName" className="text-sm font-medium">
                Nombre de la colección
              </Label>
              <Input
                id="collectionName"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Ej: Encuestas, RRHH, Eventos..."
                className="mt-2"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? 'Creando...' : 'Crear colección'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

