import { uid } from './store'

export interface PassageComment {
  id: string
  authorId: string
  authorName: string
  content: string
  createdAt: number
}

export interface PassageAnchor {
  blockId: string
  version: string
  start: number
  end: number
  quote: string
  prefix: string
  suffix: string
}

export interface PassageAnnotation extends PassageAnchor {
  id: string
  articleId: string
  propositionId: string
  createdAt: number
  comments: PassageComment[]
}

export interface ResolvedPassageAnchor {
  start: number
  end: number
}

interface AnnotationAuthor {
  id: string
  name: string
}

const STORAGE_KEY = 'mf_passage_annotations_v1'
const MAX_QUOTE_LENGTH = 800
const MAX_COMMENT_LENGTH = 1200
export const LEGACY_ANNOTATION_VERSION = 'legacy-before-semantic-blocks'

export function getPassageBlockVersion(content: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}-${content.length}`
}

/**
 * Re-anchor an immutable quote after surrounding prose changes.
 * Exact offsets win; otherwise a matching prefix or suffix is required so a
 * repeated phrase is not attached to an unrelated occurrence.
 */
export function resolvePassageAnchor(
  anchor: Pick<PassageAnchor, 'start' | 'end' | 'quote' | 'prefix' | 'suffix'>,
  text: string,
): ResolvedPassageAnchor | null {
  if (text.slice(anchor.start, anchor.end) === anchor.quote) {
    return { start: anchor.start, end: anchor.end }
  }

  let cursor = 0
  let best: (ResolvedPassageAnchor & { score: number }) | null = null
  while (cursor < text.length) {
    const start = text.indexOf(anchor.quote, cursor)
    if (start < 0) break
    const end = start + anchor.quote.length
    const prefix = text.slice(Math.max(0, start - anchor.prefix.length), start)
    const suffix = text.slice(end, end + anchor.suffix.length)
    const score = Number(prefix === anchor.prefix) + Number(suffix === anchor.suffix)
    if (!best || score > best.score) best = { start, end, score }
    cursor = start + Math.max(anchor.quote.length, 1)
  }

  return best && best.score > 0 ? { start: best.start, end: best.end } : null
}

function readAnnotations(): PassageAnnotation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    let migrated = false
    const annotations = parsed
      .filter(isPassageAnnotation)
      .map((stored) => {
        if (stored.blockId && stored.version && stored.propositionId) return stored
        migrated = true
        return {
          ...stored,
          blockId: stored.blockId ?? `${stored.articleId}.body`,
          version: stored.version ?? LEGACY_ANNOTATION_VERSION,
          propositionId: stored.propositionId ?? stored.articleId,
          prefix: stored.prefix ?? '',
          suffix: stored.suffix ?? '',
        }
      })

    if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations))
    return annotations
  } catch {
    return []
  }
}

function isPassageAnnotation(value: unknown): value is PassageAnnotation {
  if (typeof value !== 'object' || value === null) return false
  const annotation = value as Partial<PassageAnnotation>
  return typeof annotation.id === 'string'
    && typeof annotation.articleId === 'string'
    && typeof annotation.quote === 'string'
    && typeof annotation.start === 'number'
    && typeof annotation.end === 'number'
    && Array.isArray(annotation.comments)
}

function writeAnnotations(annotations: PassageAnnotation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations))
  } catch {
    throw new Error('划线评论暂时无法保存，请检查浏览器本地存储空间。')
  }
}

function createComment(author: AnnotationAuthor, content: string): PassageComment {
  const normalized = content.trim()
  if (!normalized) throw new Error('请先写下你对这段文字的疑问或想法。')
  if (normalized.length > MAX_COMMENT_LENGTH) {
    throw new Error(`评论最多 ${MAX_COMMENT_LENGTH} 个字符。`)
  }

  return {
    id: uid(),
    authorId: author.id,
    authorName: author.name,
    content: normalized,
    createdAt: Date.now(),
  }
}

export function getPassageAnnotations(articleId: string): PassageAnnotation[] {
  return readAnnotations()
    .filter((annotation) => annotation.articleId === articleId)
    .sort((left, right) => left.blockId.localeCompare(right.blockId)
      || left.start - right.start
      || left.createdAt - right.createdAt)
}

export function createPassageAnnotation(
  articleId: string,
  anchor: PassageAnchor,
  author: AnnotationAuthor,
  content: string,
): PassageAnnotation {
  if (anchor.quote.trim().length < 2) throw new Error('请至少选中两个文字。')
  if (anchor.quote.length > MAX_QUOTE_LENGTH) {
    throw new Error(`一次最多选择 ${MAX_QUOTE_LENGTH} 个字符，请缩小选中范围。`)
  }

  const existing = readAnnotations()
  const overlaps = existing.some((annotation) => annotation.articleId === articleId
    && annotation.blockId === anchor.blockId
    && annotation.version === anchor.version
    && anchor.start < annotation.end && anchor.end > annotation.start)
  if (overlaps) {
    throw new Error('这段文字与已有划线重叠，请点击原有划线继续讨论，或选择未标记的段落。')
  }

  const annotation: PassageAnnotation = {
    id: uid(),
    articleId,
    propositionId: articleId,
    ...anchor,
    createdAt: Date.now(),
    comments: [createComment(author, content)],
  }

  writeAnnotations([...existing, annotation])
  return annotation
}

export function replyToPassageAnnotation(
  annotationId: string,
  author: AnnotationAuthor,
  content: string,
): PassageAnnotation {
  const existing = readAnnotations()
  const index = existing.findIndex((annotation) => annotation.id === annotationId)
  if (index < 0) throw new Error('这条划线评论已经不存在，请刷新页面后重试。')

  const updated: PassageAnnotation = {
    ...existing[index],
    comments: [...existing[index].comments, createComment(author, content)],
  }
  writeAnnotations(existing.map((annotation, itemIndex) => itemIndex === index ? updated : annotation))
  return updated
}
