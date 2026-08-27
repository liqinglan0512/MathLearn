import { useRef, useState } from 'react'
import { FileText, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Attachment } from '@/lib/types'
import { FEATURES } from '@/config/features'
import { isSafeStoredAttachment } from '@/lib/permissions'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB，localStorage 演示限制
const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const

export function AttachmentUploader({
  value,
  onChange,
}: {
  value: Attachment[]
  onChange: (v: Attachment[]) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState('')

  function handleFiles(files: FileList | null) {
    if (!files) return
    if (!FEATURES.attachmentUpload) {
      setErr('MathForge 0.2 已关闭附件上传。')
      if (ref.current) ref.current.value = ''
      return
    }
    setErr('')
    for (const file of Array.from(files)) {
      const isImage = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
      const isPdf = file.type === 'application/pdf'
      if (!isImage && !isPdf) {
        setErr('仅支持 PNG、JPEG、WebP 或 PDF；不接受 SVG、HTML、ZIP 与任意 MIME。')
        continue
      }
      if (file.size > MAX_SIZE) {
        setErr(`「${file.name}」超过 2MB：演示版存储受限，请压缩后再传`)
        continue
      }
      const reader = new FileReader()
      reader.onload = () => {
        onChange([
          ...value,
          { name: file.name, type: isPdf ? 'pdf' : 'image', dataUrl: reader.result as string },
        ])
      }
      reader.readAsDataURL(file)
    }
    if (ref.current) ref.current.value = ''
  }

  return (
    <div>
      {!FEATURES.attachmentUpload && (
        <p className="text-xs leading-6 text-[#96938a]">附件上传在 MathForge 0.2 中关闭。</p>
      )}
      <input
        ref={ref}
        type="file"
        accept={ACCEPTED_MIME.join(',')}
        multiple
        className="hidden"
        disabled={!FEATURES.attachmentUpload}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {FEATURES.attachmentUpload && (
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
          <ImageIcon className="mr-1.5 h-4 w-4" /> 添加图片 / PDF
        </Button>
      )}
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
      {value.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {value.map((a, i) => (
            <li
              key={a.name + i}
              className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm"
            >
              {a.type === 'pdf' ? <FileText className="h-4 w-4 text-red-400" /> : <ImageIcon className="h-4 w-4 text-indigo-300" />}
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
              <button
                type="button"
                className="text-neutral-400 hover:text-red-400"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AttachmentList({ items }: { items: Attachment[] }) {
  if (!items.length) return null
  return (
    <div className="mt-4 space-y-3">
      {items.map((a, i) =>
        !isSafeStoredAttachment(a) ? (
          <div key={i} className="rounded-lg border border-[#c99972]/20 px-4 py-3 text-sm text-[#b8a48b]">
            {a.name}（该历史附件格式不在安全预览清单中，内容未删除）
          </div>
        ) : a.type === 'image' ? (
          <img key={i} src={a.dataUrl} alt={a.name} className="max-w-full rounded-lg border border-white/10" />
        ) : (
          <a
            key={i}
            href={a.dataUrl}
            download={a.name}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-indigo-300 hover:bg-white/5"
          >
            <FileText className="h-4 w-4" /> {a.name}（点击下载）
          </a>
        ),
      )}
    </div>
  )
}
