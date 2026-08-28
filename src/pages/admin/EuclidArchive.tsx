import { EuclidCatalogBrowser } from '@/components/euclid/EuclidCatalogBrowser'

export default function EuclidArchive() {
  return (
    <div className="mx-auto max-w-5xl py-10 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[#ad986a]">INTERNAL · ARCHIVED EXPERIMENT</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#f0e8d3] sm:text-4xl">《几何原本》内部归档</h1>
      <p className="mt-4 max-w-2xl text-[14px] leading-7 text-[#a8a59a]">
        这里保留 0.2 内容模型试验的目录、正文和证明依赖，用于本地审计与未来恢复；它不属于当前公开学习课程。
      </p>
      <EuclidCatalogBrowser internal />
    </div>
  )
}
