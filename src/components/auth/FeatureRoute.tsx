import type { ReactNode } from 'react'
import { LockKeyhole } from 'lucide-react'

export function FeatureRoute({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  if (enabled) return children

  return (
    <section className="mx-auto max-w-xl py-24 text-center" aria-labelledby="feature-closed-title">
      <LockKeyhole className="mx-auto h-6 w-6 text-[#b79d68]" />
      <h1 id="feature-closed-title" className="mt-5 text-2xl font-semibold text-[#eee6d3]">
        投稿入口当前关闭
      </h1>
      <p className="mt-4 text-sm leading-7 text-[#9f9c93]">
        MathForge 0.2 正在建立版本与人工审核流程。普通账户暂时不能提交正式内容或附件，保存也不会自动变成发布。
      </p>
    </section>
  )
}
