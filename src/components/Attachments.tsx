import { useRef, useState } from 'react'
import { FileText, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Attachment } from '@/lib/types'
import { uid } from '@/lib/store'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB，localStorage 演示限制

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
    setErr('')
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'
      if (!isImage && !isPdf) {
        setErr('仅支持图片或 PDF 文件')
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
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
        <ImageIcon className="mr-1.5 h-4 w-4" /> 添加图片 / PDF
      </Button>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      {value.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {value.map((a, i) => (
            <li
              key={a.name + i}
              className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
            >
              {a.type === 'pdf' ? <FileText className="h-4 w-4 text-red-500" /> : <ImageIcon className="h-4 w-4 text-indigo-500" />}
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
              <button
                type="button"
                className="text-neutral-400 hover:text-red-600"
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
        a.type === 'image' ? (
          <img key={i} src={a.dataUrl} alt={a.name} className="max-w-full rounded-lg border border-neutral-200" />
        ) : (
          <a
            key={i}
            href={a.dataUrl}
            download={a.name}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-3 text-sm text-indigo-600 hover:bg-neutral-50"
          >
            <FileText className="h-4 w-4" /> {a.name}（点击下载）
          </a>
        ),
      )}
    </div>
  )
}

export { uid }
