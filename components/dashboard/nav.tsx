'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from '@supabase/supabase-js'
import { Bookmark, Layers, LogOut, Plus, Settings, User as UserIcon, Users } from 'lucide-react'
import { toast } from 'sonner'

interface DashboardNavProps {
  user: User
  isAdmin?: boolean
}

export function DashboardNav({ user, isAdmin = false }: DashboardNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('No se pudo cerrar sesión')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const initials = user.email?.slice(0, 2).toUpperCase() || 'U'
  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />
          <div className="hidden md:flex items-center gap-6">
            {[
              { href: '/dashboard', label: 'Mis formularios' },
              { href: '/questions', label: 'Preguntas' },
              { href: '/segments', label: 'Segmentos' },
              ...(isAdmin ? [{ href: '/users', label: 'Usuarios' }] : []),
              { href: '/settings', label: 'Configuración' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Link href="/forms/new">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Crear formulario</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0" aria-label="Menú de cuenta">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={avatarUrl} alt={user.email || 'Usuario'} />
                  <AvatarFallback className="bg-blue-600 text-white font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user.user_metadata?.full_name && (
                    <p className="font-medium">{user.user_metadata.full_name}</p>
                  )}
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Mis formularios
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/questions" className="cursor-pointer">
                  <Bookmark className="mr-2 h-4 w-4" />
                  Preguntas reutilizables
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/segments" className="cursor-pointer">
                  <Layers className="mr-2 h-4 w-4" />
                  Segmentos reutilizables
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/users" className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    Gestión de usuarios
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
