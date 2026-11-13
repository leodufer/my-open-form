'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/lib/auth/roles'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { KeyRound, Loader2, Save } from 'lucide-react'

interface AccountSettingsFormProps {
  userId: string
  email: string
  initialFullName: string
  role: UserRole
  createdAt: string
}

export function AccountSettingsForm({
  userId,
  email,
  initialFullName,
  role,
  createdAt,
}: AccountSettingsFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo actualizar tu perfil')
      } else {
        toast.success('Perfil actualizado')
        router.refresh()
      }
    } catch {
      toast.error('Error de red al actualizar tu perfil')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setIsSavingPassword(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo actualizar la contraseña')
      } else {
        toast.success('Contraseña actualizada correctamente')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      toast.error('Error de red al actualizar la contraseña')
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Mi cuenta</h2>
          {role === 'admin' ? (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Administrador</Badge>
          ) : (
            <Badge variant="outline">Usuario</Badge>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="mt-2 bg-gray-50"
            />
            <p className="text-sm text-gray-500 mt-1">
              Tu correo electrónico no se puede modificar
            </p>
          </div>

          <div>
            <Label htmlFor="full-name">Nombre completo</Label>
            <Input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre y apellido"
              className="mt-2"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSavingProfile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSavingProfile ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-600" />
          Cambiar contraseña
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Actualizá tu contraseña de acceso para iniciar sesión.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetí la contraseña"
              required
              className="mt-2"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={isSavingPassword}>
              {isSavingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Actualizar contraseña
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">Cuenta creada</h2>
        <p className="text-gray-600">
          {new Date(createdAt).toLocaleDateString('es-AR', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </Card>
    </div>
  )
}

