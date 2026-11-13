import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/auth/roles'
import { DashboardNav } from '@/components/dashboard/nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const isAdmin = await isAdminUser(supabase, user)

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav user={user} isAdmin={isAdmin} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
