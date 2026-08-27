import type { ReactNode } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { canUseAdminContentManagement } from '@/lib/permissions'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (canUseAdminContentManagement(user)) return children

  return (
    <section className="mx-auto max-w-xl py-24 text-center" aria-labelledby="admin-closed-title">
      <LockKeyhole className="mx-auto h-6 w-6 text-[#b79d68]" />
      <h1 id="admin-closed-title" className="mt-5 text-2xl font-semibold text-[#eee6d3]">内部编辑后台不可用</h1>
      <p className="mt-4 text-sm leading-7 text-[#9f9c93]">
        此入口只在本地开发模式向管理员原型账户开放。它不会出现在生产站点，也不构成正式服务端权限系统。
      </p>
    </section>
  )
}
