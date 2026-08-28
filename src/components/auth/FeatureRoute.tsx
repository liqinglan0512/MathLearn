import type { ReactNode } from 'react'
import { ExternalLink, LockKeyhole } from 'lucide-react'
import { GITHUB_ISSUES_URL, GITHUB_REPOSITORY_URL } from '@/config/product'

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
        MathForge 当前不接受站内投稿或附件。数学勘误、解释改进与代码贡献统一通过 GitHub 的 Issue 和 Pull Request 审核。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <a href={GITHUB_ISSUES_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#c8b17e] hover:text-[#ead7aa]">
          提交 Issue <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a href={GITHUB_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#a9a69c] hover:text-[#e6dfd0]">
          查看贡献说明 <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  )
}
