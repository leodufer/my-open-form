import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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
          <p className="text-gray-600 mt-1">Administrá la configuración de tu cuenta</p>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Cuenta</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input 
              id="email" 
              type="email" 
              value={user.email || ''} 
              disabled 
              className="mt-2 bg-gray-50"
            />
            <p className="text-sm text-gray-500 mt-1">
              Tu correo electrónico no se puede modificar
            </p>
          </div>

          {user.user_metadata?.full_name && (
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input 
                id="name" 
                value={user.user_metadata.full_name} 
                disabled 
                className="mt-2 bg-gray-50"
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold mb-2">Cuenta creada</h2>
        <p className="text-gray-600">
          {new Date(user.created_at).toLocaleDateString('es-ES', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </Card>
    </div>
  )
}

