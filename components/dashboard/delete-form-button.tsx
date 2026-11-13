'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteFormButtonProps {
  formId: string
  formTitle: string
}

export function DeleteFormButton({ formId, formTitle }: DeleteFormButtonProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    setIsDeleting(true)
    const { error } = await supabase
      .from('forms')
      .delete()
      .eq('id', formId)

    if (error) {
      toast.error('No se pudo eliminar el formulario')
      setIsDeleting(false)
    } else {
      toast.success('Formulario eliminado')
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <DropdownMenuItem
        onClick={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
        className="cursor-pointer text-red-600 focus:text-red-600"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Eliminar
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar formulario</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar &quot;{formTitle || 'Formulario sin título'}&quot;? 
              Esta acción no se puede deshacer. También se eliminarán todas las respuestas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar formulario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

