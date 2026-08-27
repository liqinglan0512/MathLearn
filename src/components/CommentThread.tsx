import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/lib/auth-context'
import { store, uid } from '@/lib/store'
import { MathProse } from '@/components/reading/MathProse'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ThreadComment {
  id: string
  authorName: string
  content: string
  createdAt: number
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function CommentThread({ targetId, comments, onPosted }: {
  targetId: string
  comments: ThreadComment[]
  onPosted: () => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [text, setText] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!user) return navigate('/login')
    if (!text.trim()) return

    store.addComment({
      id: uid(),
      targetId,
      authorId: user.id,
      authorName: user.name,
      content: text.trim(),
      createdAt: Date.now(),
    })
    setText('')
    onPosted()
  }

  return (
    <div className="mt-5">
      <div className="space-y-5">
        {comments.map((comment) => (
          <div key={comment.id} className="text-sm">
            <span className="font-medium text-[#ded9cc]">{comment.authorName}</span>
            <span className="ml-2 text-xs text-[#929188]">{formatDate(comment.createdAt)}</span>
            <p className="mt-1.5 leading-7 text-[#bdb9ad]"><MathProse content={comment.content} /></p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-[13px] text-[#96958d]">还没有讨论，可以从一个具体条件或疑问开始。</p>
        )}
      </div>
      <form onSubmit={submit} className="mt-6">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder={user ? '写下你的想法…' : '登录后参与讨论'}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" type="submit" disabled={!text.trim()}>发表</Button>
        </div>
      </form>
    </div>
  )
}
