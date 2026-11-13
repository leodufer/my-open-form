'use client'

import { useMemo, useState } from 'react'
import { ManagedUser } from '@/app/api/admin/users/route'
import { isPrimaryAdminEmail, UserRole } from '@/lib/auth/roles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MoreVertical,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'

interface UsersManagerProps {
  currentUserId: string
  initialUsers: ManagedUser[]
  configError?: string | null
}

function formatDate(date: string | null) {
  if (!date) return 'Nunca'
  return new Date(date).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function UsersManager({
  currentUserId,
  initialUsers,
  configError,
}: UsersManagerProps) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Reset password dialog
  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Delete user dialog
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const q = searchQuery.toLowerCase()
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.fullName && u.fullName.toLowerCase().includes(q))
    )
  }, [users, searchQuery])

  const resetCreateForm = () => {
    setEmail('')
    setFullName('')
    setRole('user')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !email.includes('@')) {
      toast.error('Ingresá un correo electrónico válido')
      return
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          role,
          password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo crear el usuario')
      } else {
        setUsers((prev) => [data.user, ...prev])
        toast.success(`Usuario ${data.user.email} creado correctamente`)
        setCreateOpen(false)
        resetCreateForm()
      }
    } catch {
      toast.error('Error de red al crear el usuario')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordTarget) return

    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setIsUpdatingPassword(true)
    try {
      const res = await fetch(`/api/admin/users/${passwordTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo actualizar la contraseña')
      } else {
        toast.success(`Contraseña actualizada para ${passwordTarget.email}`)
        setPasswordTarget(null)
        setNewPassword('')
        setConfirmNewPassword('')
      }
    } catch {
      toast.error('Error de red al actualizar la contraseña')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleToggleRole = async (target: ManagedUser) => {
    const nextRole: UserRole = target.role === 'admin' ? 'user' : 'admin'
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo cambiar el rol')
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === target.id ? { ...u, role: nextRole } : u))
        )
        toast.success(
          `${target.email} ahora es ${nextRole === 'admin' ? 'Administrador' : 'Usuario'}`
        )
      }
    } catch {
      toast.error('Error de red al cambiar el rol')
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo eliminar el usuario')
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
        toast.success(`Usuario ${deleteTarget.email} eliminado`)
        setDeleteTarget(null)
      }
    } catch {
      toast.error('Error de red al eliminar el usuario')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de usuarios</h1>
          <p className="text-slate-600 mt-1">
            Creá y administrá usuarios con acceso por correo electrónico y contraseña.
          </p>
        </div>
        <Button
          onClick={() => {
            resetCreateForm()
            setCreateOpen(true)
          }}
          disabled={Boolean(configError)}
          className="bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Nuevo usuario
        </Button>
      </div>

      {configError ? (
        <Card className="p-6 border-amber-200 bg-amber-50 text-amber-900">
          <p className="font-medium">Configuración incompleta</p>
          <p className="text-sm mt-1">{configError}</p>
        </Card>
      ) : (
        <>
          {/* Search */}
          <div className="relative max-w-md mb-6">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por correo o nombre..."
              className="pl-10 bg-white"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <Card className="p-12 text-center bg-white">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                {users.length === 0
                  ? 'No hay usuarios registrados'
                  : 'No se encontraron usuarios'}
              </h2>
              <p className="text-sm text-slate-500">
                {users.length === 0
                  ? 'Creá el primer usuario con correo y contraseña.'
                  : 'Probá con otro término de búsqueda.'}
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUserId
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">
                                {u.fullName || u.email}
                              </span>
                              {isSelf && (
                                <Badge variant="secondary" className="text-xs">
                                  Tú
                                </Badge>
                              )}
                            </div>
                            {u.fullName && (
                              <span className="text-xs text-slate-500">{u.email}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.role === 'admin' ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600">
                              Usuario
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.emailConfirmedAt ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              Confirmado
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pendiente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                          {formatDate(u.lastSignInAt)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                          {formatDate(u.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setPasswordTarget(u)
                                  setNewPassword('')
                                  setConfirmNewPassword('')
                                }}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Cambiar contraseña
                              </DropdownMenuItem>
                              {!isSelf && !isPrimaryAdminEmail(u.email) && (
                                <>
                                  <DropdownMenuItem onClick={() => handleToggleRole(u)}>
                                    <Users className="mr-2 h-4 w-4" />
                                    {u.role === 'admin'
                                      ? 'Cambiar a Usuario'
                                      : 'Hacer Administrador'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteTarget(u)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              Creá una cuenta con correo electrónico y contraseña para que pueda iniciar sesión en OpenForm.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label htmlFor="new-user-email">Correo electrónico</Label>
              <Input
                id="new-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="new-user-name">
                Nombre completo <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="new-user-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre y apellido"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="new-user-password">Contraseña</Label>
              <div className="relative mt-1.5">
                <Input
                  id="new-user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="new-user-confirm-password">Confirmar contraseña</Label>
              <Input
                id="new-user-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí la contraseña"
                required
                className="mt-1.5"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={!!passwordTarget}
        onOpenChange={(open) => !open && setPasswordTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Establecé una nueva contraseña para <strong>{passwordTarget?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <Label htmlFor="edit-password">Nueva contraseña</Label>
              <Input
                id="edit-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-confirm-password">Confirmar nueva contraseña</Label>
              <Input
                id="edit-confirm-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repetí la contraseña"
                required
                className="mt-1.5"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordTarget(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingPassword}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdatingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar contraseña
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar usuario?</DialogTitle>
            <DialogDescription>
              Se eliminará la cuenta de <strong>{deleteTarget?.email}</strong> junto con sus formularios y datos asociados. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

