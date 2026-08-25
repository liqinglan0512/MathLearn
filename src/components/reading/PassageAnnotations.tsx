import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Highlighter, LogIn, MessageCircle, MessageSquareText, Send, X } from 'lucide-react'
import { MathProse } from './MathProse'
import { useAuth } from '@/lib/auth'
import {
  createPassageAnnotation,
  getPassageAnnotations,
  replyToPassageAnnotation,
  type PassageAnchor,
  type PassageAnnotation,
} from '@/lib/annotations'

interface TextSegment {
  node: Text
  start: number
  end: number
}

interface PendingSelection {
  anchor: PassageAnchor
  top: number
  left: number
}

const EXCLUDED_SELECTOR = '.katex, math, [data-annotation-ui="true"], [aria-hidden="true"]'
const PENDING_SELECTION_KEY = 'mf_pending_passage_annotation'

function restorePendingSelection(articleId: string): PendingSelection | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SELECTION_KEY)
    if (!raw) return null
    const pending = JSON.parse(raw) as { articleId?: string; selection?: PendingSelection }
    if (pending.articleId !== articleId || !pending.selection?.anchor?.quote) return null
    sessionStorage.removeItem(PENDING_SELECTION_KEY)
    return pending.selection
  } catch {
    return null
  }
}

function collectTextSegments(container: HTMLElement): { segments: TextSegment[]; text: string } {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      return parent?.closest(EXCLUDED_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    },
  })
  const segments: TextSegment[] = []
  let text = ''
  let node = walker.nextNode()

  while (node) {
    const value = node.textContent ?? ''
    segments.push({ node: node as Text, start: text.length, end: text.length + value.length })
    text += value
    node = walker.nextNode()
  }

  return { segments, text }
}

function readSelectedPassage(container: HTMLElement, wrapper: HTMLElement): PendingSelection | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const range = selection.getRangeAt(0)
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return null
  if (range.startContainer.nodeType !== Node.TEXT_NODE || range.endContainer.nodeType !== Node.TEXT_NODE) return null

  const firstBlock = range.startContainer.parentElement?.closest<HTMLElement>('[data-block-id][data-block-version]')
  const lastBlock = range.endContainer.parentElement?.closest<HTMLElement>('[data-block-id][data-block-version]')
  if (!firstBlock || firstBlock !== lastBlock || !firstBlock.dataset.blockId || !firstBlock.dataset.blockVersion) return null

  const { segments, text } = collectTextSegments(firstBlock)
  const first = segments.find((segment) => segment.node === range.startContainer)
  const last = segments.find((segment) => segment.node === range.endContainer)
  if (!first || !last) return null

  let start = first.start + range.startOffset
  let end = last.start + range.endOffset
  const raw = text.slice(start, end)
  start += raw.length - raw.trimStart().length
  end -= raw.length - raw.trimEnd().length
  const quote = text.slice(start, end)
  if (quote.length < 2 || quote.length > 800) return null

  const bounds = range.getBoundingClientRect()
  const wrapperBounds = wrapper.getBoundingClientRect()
  const preferredWidth = Math.min(352, wrapperBounds.width)

  return {
    anchor: {
      blockId: firstBlock.dataset.blockId,
      version: firstBlock.dataset.blockVersion,
      start,
      end,
      quote,
      prefix: text.slice(Math.max(0, start - 48), start),
      suffix: text.slice(end, end + 48),
    },
    top: Math.max(0, bounds.bottom - wrapperBounds.top + 8),
    left: Math.max(0, Math.min(bounds.left - wrapperBounds.left, wrapperBounds.width - preferredWidth)),
  }
}

function clearAnnotationMarks(container: HTMLElement) {
  const marks = container.querySelectorAll('mark[data-mf-annotation]')
  for (const mark of marks) {
    const parent = mark.parentNode
    if (!parent) continue
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
    parent.normalize()
  }
}

function resolveAnchor(annotation: PassageAnnotation, text: string): { start: number; end: number } | null {
  if (text.slice(annotation.start, annotation.end) === annotation.quote) {
    return { start: annotation.start, end: annotation.end }
  }

  let cursor = 0
  let best: { start: number; end: number; score: number } | null = null
  while (cursor < text.length) {
    const start = text.indexOf(annotation.quote, cursor)
    if (start < 0) break
    const end = start + annotation.quote.length
    const prefix = text.slice(Math.max(0, start - annotation.prefix.length), start)
    const suffix = text.slice(end, end + annotation.suffix.length)
    const score = Number(prefix === annotation.prefix) + Number(suffix === annotation.suffix)
    if (!best || score > best.score) best = { start, end, score }
    cursor = start + Math.max(annotation.quote.length, 1)
  }

  return best && best.score > 0 ? { start: best.start, end: best.end } : null
}

function applyAnnotationMarks(container: HTMLElement, annotations: PassageAnnotation[], paperMode: boolean) {
  clearAnnotationMarks(container)
  if (annotations.length === 0) return

  const blocks = container.querySelectorAll<HTMLElement>('[data-block-id][data-block-version]')
  for (const block of blocks) {
    const { segments, text } = collectTextSegments(block)
    const anchors = annotations
      .filter((annotation) => annotation.blockId === block.dataset.blockId)
      .map((annotation) => ({ annotation, anchor: resolveAnchor(annotation, text) }))
      .filter((item): item is { annotation: PassageAnnotation; anchor: { start: number; end: number } } => Boolean(item.anchor))
      .sort((left, right) => right.anchor.start - left.anchor.start)

    for (const { annotation, anchor } of anchors) {
      const touched = segments
        .filter((segment) => segment.start < anchor.end && segment.end > anchor.start)
        .sort((left, right) => right.start - left.start)

      for (const segment of touched) {
        const start = Math.max(0, anchor.start - segment.start)
        const end = Math.min(segment.node.length, anchor.end - segment.start)
        if (end <= start) continue

        const range = document.createRange()
        range.setStart(segment.node, start)
        range.setEnd(segment.node, end)

        const mark = document.createElement('mark')
        const stale = annotation.version !== block.dataset.blockVersion
        mark.dataset.mfAnnotation = annotation.id
        mark.dataset.annotationBlock = annotation.blockId
        mark.dataset.annotationVersion = annotation.version
        mark.tabIndex = 0
        mark.setAttribute('role', 'button')
        mark.setAttribute('aria-label', `${stale ? '查看旧版本划线评论' : '查看划线评论'}：${annotation.quote.slice(0, 30)}`)
        mark.style.backgroundColor = paperMode ? 'rgba(181, 149, 77, 0.16)' : 'rgba(199, 173, 112, 0.13)'
        mark.style.color = 'inherit'
        mark.style.textDecorationLine = 'underline'
        mark.style.textDecorationColor = paperMode ? 'rgba(139, 104, 46, 0.82)' : 'rgba(199, 173, 112, 0.9)'
        mark.style.textDecorationThickness = '2px'
        mark.style.textDecorationStyle = stale ? 'dotted' : 'solid'
        mark.style.textUnderlineOffset = '3px'
        mark.style.cursor = 'pointer'
        range.surroundContents(mark)
      }
    }
  }
}

export function PassageAnnotations({
  articleId,
  paperMode,
  blocks,
  children,
}: {
  articleId: string
  paperMode: boolean
  blocks: readonly { id: string; title: string; version: string }[]
  children: ReactNode
}) {
  const { user } = useAuth()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const [annotations, setAnnotations] = useState(() => getPassageAnnotations(articleId))
  const [selection, setSelection] = useState<PendingSelection | null>(() => restorePendingSelection(articleId))
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    applyAnnotationMarks(content, annotations, paperMode)
    return () => clearAnnotationMarks(content)
  }, [annotations, paperMode])

  function captureSelection() {
    const content = contentRef.current
    const wrapper = wrapperRef.current
    if (!content || !wrapper) return
    const nextSelection = readSelectedPassage(content, wrapper)
    if (!nextSelection) return
    setSelection(nextSelection)
    setWriting(false)
    setError('')
  }

  function openAnnotation(event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) {
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('a[href]')) return
    const mark = target.closest<HTMLElement>('mark[data-mf-annotation]')
    if (!mark?.dataset.mfAnnotation) return
    if ('key' in event) event.preventDefault()
    setActiveId(mark.dataset.mfAnnotation)
    setPanelOpen(true)
    setSelection(null)
    window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0)
  }

  function closeComposer() {
    setSelection(null)
    setWriting(false)
    setDraft('')
    setError('')
  }

  function rememberSelectionForLogin() {
    if (!selection) return
    try {
      sessionStorage.setItem(PENDING_SELECTION_KEY, JSON.stringify({ articleId, selection }))
    } catch {
      // 浏览器禁用会话存储时，仍然允许正常登录；已发布的划线评论不受影响。
    }
  }

  function saveAnnotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selection || !user) return

    try {
      const annotation = createPassageAnnotation(articleId, selection.anchor, user, draft)
      setAnnotations(getPassageAnnotations(articleId))
      setActiveId(annotation.id)
      setPanelOpen(true)
      window.getSelection()?.removeAllRanges()
      closeComposer()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '评论保存失败，请稍后重试。')
    }
  }

  function postReply(event: FormEvent<HTMLFormElement>, annotationId: string) {
    event.preventDefault()
    if (!user) return

    try {
      replyToPassageAnnotation(annotationId, user, replyDrafts[annotationId] ?? '')
      setAnnotations(getPassageAnnotations(articleId))
      setReplyDrafts((existing) => ({ ...existing, [annotationId]: '' }))
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '回复保存失败，请稍后重试。')
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        data-annotation-ui="true"
        className="mb-7 flex flex-wrap items-center justify-between gap-3 text-[12px] opacity-75"
      >
        <span className="inline-flex items-center gap-1.5">
          <Highlighter className="h-3.5 w-3.5 text-[#b8a06a]" />
          选中正文文字，即可划线讨论
        </span>
        {annotations.length > 0 && (
          <button
            type="button"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((current) => !current)}
            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-100"
          >
            <MessageSquareText className="h-3.5 w-3.5" /> {annotations.length} 处划线
          </button>
        )}
      </div>

      <div
        ref={contentRef}
        onMouseUp={captureSelection}
        onTouchEnd={() => window.setTimeout(captureSelection, 0)}
        onKeyUp={(event) => { if (event.shiftKey) captureSelection() }}
        onClick={openAnnotation}
        onKeyDown={openAnnotation}
      >
        {children}
      </div>

      {selection && (
        <div
          data-annotation-ui="true"
          className={`absolute z-40 max-w-full rounded-lg border p-3 shadow-xl ${
            paperMode
              ? 'border-[#d8cdb8] bg-[#fffdf7] text-[#403b32]'
              : 'border-white/[0.12] bg-[#1a1b17] text-[#e6e1d4]'
          }`}
          style={{ top: selection.top, left: selection.left, width: 'min(22rem, 100%)' }}
          role="dialog"
          aria-label="为选中文字添加划线评论"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="max-h-16 overflow-hidden break-words border-l-2 border-[#c7ad70]/70 pl-2 text-xs leading-5 opacity-80">
              <MathProse content={selection.anchor.quote} />
            </p>
            <button type="button" onClick={closeComposer} aria-label="关闭划线评论" className="shrink-0 p-1 opacity-70 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {!user ? (
            <Link
              to="/login"
              onClick={rememberSelectionForLogin}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#b59a60] hover:text-[#c7ad70]"
            >
              <LogIn className="h-3.5 w-3.5" /> 登录后参与这段文字的讨论
            </Link>
          ) : !writing ? (
            <button
              type="button"
              onClick={() => setWriting(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#b59a60] hover:text-[#c7ad70]"
            >
              <MessageCircle className="h-3.5 w-3.5" /> 为这段文字写评论
            </button>
          ) : (
            <form onSubmit={saveAnnotation} className="mt-3">
              <label htmlFor={`annotation-${articleId}`} className="sr-only">划线评论内容</label>
              <textarea
                id={`annotation-${articleId}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1200}
                rows={3}
                placeholder="这里的逻辑哪里不清楚？或者你想到另一种解释？"
                className="w-full resize-y rounded-md border border-current/15 bg-transparent px-2.5 py-2 text-xs leading-6 outline-none focus:border-[#c7ad70]/70"
              />
              <button type="submit" className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#c7ad70] px-3 py-1.5 text-xs font-medium text-[#171712]">
                <Send className="h-3.5 w-3.5" /> 保存划线评论
              </button>
            </form>
          )}
          {error && <p role="alert" className="mt-2 text-xs leading-5 text-[#c67f72]">{error}</p>}
        </div>
      )}

      {panelOpen && annotations.length > 0 && (
        <section ref={panelRef} data-annotation-ui="true" className="mt-12 border-t border-current/10 pt-7" aria-label="划线讨论">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-sm font-medium">
              <MessageSquareText className="h-4 w-4 text-[#b8a06a]" /> 划线讨论 · {annotations.length}
            </h2>
            <span className="text-[11px] opacity-65">真实读者留言，保存在当前浏览器</span>
          </div>

          <div className="mt-5 space-y-5">
            {annotations.map((annotation) => (
              <article
                key={annotation.id}
                className={`rounded-md border p-4 ${
                  activeId === annotation.id ? 'border-[#c7ad70]/55' : 'border-current/10'
                }`}
              >
                <blockquote className="break-words border-l-2 border-[#c7ad70]/65 pl-3 text-[13px] leading-7 opacity-85">
                  <MathProse content={annotation.quote} />
                </blockquote>
                <div className="mt-2 text-[11px] opacity-70">
                  所属步骤：{blocks.find((block) => block.id === annotation.blockId)?.title ?? '原证明区块已调整'}
                </div>
                {blocks.find((block) => block.id === annotation.blockId)?.version !== annotation.version && (
                  <p role="status" className="mt-2 rounded-sm bg-[#c99d67]/10 px-2 py-1.5 text-[11px] leading-5 text-[#c29463]">
                    此讨论基于旧版本内容。已保留原始引文；只有引文与上下文能够重新核对时，才会显示在当前文字上。
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {annotation.comments.map((comment) => (
                    <div key={comment.id} className="text-xs leading-6">
                      <div className="flex flex-wrap items-center gap-x-2 opacity-70">
                        <span className="font-medium">{comment.authorName}</span>
                        <span>{new Date(comment.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] opacity-90">
                        <MathProse content={comment.content} />
                      </p>
                    </div>
                  ))}
                </div>

                {user ? (
                  <form onSubmit={(event) => postReply(event, annotation.id)} className="mt-4 flex items-start gap-2">
                    <label htmlFor={`reply-${annotation.id}`} className="sr-only">回复这段划线讨论</label>
                    <input
                      id={`reply-${annotation.id}`}
                      value={replyDrafts[annotation.id] ?? ''}
                      onChange={(event) => setReplyDrafts((existing) => ({ ...existing, [annotation.id]: event.target.value }))}
                      maxLength={1200}
                      placeholder="继续讨论这一步……"
                      className="min-w-0 flex-1 rounded-md border border-current/15 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-[#c7ad70]/70"
                    />
                    <button type="submit" className="shrink-0 rounded-md px-2 py-1.5 text-xs text-[#b59a60] hover:text-[#c7ad70]">
                      回复
                    </button>
                  </form>
                ) : (
                  <Link to="/login" className="mt-4 inline-flex text-xs text-[#b59a60] hover:text-[#c7ad70]">登录后回复</Link>
                )}
              </article>
            ))}
          </div>
          {error && !selection && <p role="alert" className="mt-3 text-xs text-[#c67f72]">{error}</p>}
        </section>
      )}
    </div>
  )
}
