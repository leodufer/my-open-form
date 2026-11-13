import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountSettingsForm } from '@/components/settings/account-settings-form'
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = await getUserRole(supabase, user)
  const initialFullName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : ''

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600 mt-1">Administrá tu propio perfil y contraseña</p>
        </div>
      </div>

      <AccountSettingsForm
        userId={user.id}
        email={user.email || ''}
        initialFullName={initialFullName}
        role={role}
        createdAt={user.created_at}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Documentación y Manual de Usuario
          </CardTitle>
          <CardDescription>
            Consultá la guía completa de uso, diagramas y ejemplos interactivos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/docs/index.html" target="_blank" rel="noopener noreferrer">
              <BookOpen className="w-4 h-4 mr-2" />
              Abrir documentación
              <ExternalLink className="w-3.5 h-3.5 ml-2 text-gray-500" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
