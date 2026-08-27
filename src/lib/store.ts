import type { Article, Comment, Paper, Problem, Solution, User } from './types'
import { seedArticles, seedPapers, seedProblems, seedSolutions, seedComments } from './seed'
import { normalizeChapter } from './taxonomy'
import { assertAttachmentsAllowed, assertCanSubmitPublicContent, type Actor } from './permissions'

const KEYS = {
  problems: 'mf_problems',
  solutions: 'mf_solutions',
  comments: 'mf_comments',
  articles: 'mf_articles',
  papers: 'mf_papers',
  users: 'mf_users',
  session: 'mf_session',
}

type Key = keyof typeof KEYS

function normalizePersistedRecord<T extends { id: string }>(key: Key, value: T): T {
  if (key !== 'problems') return value

  const problem = value as unknown as Problem
  const chapter = normalizeChapter(problem.chapter, problem.title, problem.tags)
  return chapter === problem.chapter ? value : ({ ...problem, chapter } as unknown as T)
}

// 读取时同步种子条目（按 id 覆盖更新），并把新增种子合并进去，保证老访客也能看到新内容与修正
function read<T extends { id: string }>(key: Key, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(KEYS[key])
    if (raw) {
      const existing = JSON.parse(raw) as T[]
      const bundledById = new Map(seed.map((entry) => [entry.id, entry]))
      const existingIds = new Set(existing.map((entry) => entry.id))
      const merged = existing.map((entry) => bundledById.get(entry.id) ?? normalizePersistedRecord(key, entry))
      const missing = seed.filter((entry) => !existingIds.has(entry.id))
      const result = [...merged, ...missing]
      if (missing.length > 0 || JSON.stringify(result) !== raw) {
        localStorage.setItem(KEYS[key], JSON.stringify(result))
      }
      return result
    }
  } catch {
    /* corrupted -> reseed */
  }
  localStorage.setItem(KEYS[key], JSON.stringify(seed))
  return [...seed]
}

let cachedArticleStorage: string | null | undefined
let cachedArticleResults: Article[] | undefined

/**
 * 内置典籍属于应用资源，不应再完整复制到浏览器 localStorage。
 * 这里只持久化用户创建的文章，并自动迁移旧版本保存的内置文章副本。
 */
function readArticles(): Article[] {
  const stored = localStorage.getItem(KEYS.articles)
  if (stored === cachedArticleStorage && cachedArticleResults) return cachedArticleResults

  let previous: Article[] = []
  if (stored) {
    try {
      const parsed: unknown = JSON.parse(stored)
      if (Array.isArray(parsed)) previous = parsed as Article[]
    } catch {
      previous = []
    }
  }

  const bundledIds = new Set(seedArticles.map((article) => article.id))
  const customArticles = previous
    .filter((article) => !bundledIds.has(article.id))
    .map((article) => {
      const topic = normalizeChapter(article.topic, article.title)
      return topic === article.topic ? article : { ...article, topic }
    })

  const compactStorage = JSON.stringify(customArticles)
  if (stored !== compactStorage) {
    try {
      localStorage.setItem(KEYS.articles, compactStorage)
    } catch {
      // 内置典籍无需持久化；即使访客浏览器禁止写入，也仍可继续阅读。
    }
  }

  cachedArticleStorage = localStorage.getItem(KEYS.articles)
  cachedArticleResults = [...customArticles, ...seedArticles]
  return cachedArticleResults
}

function write<T>(key: Key, value: T[]) {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(value))
  } catch {
    throw new Error('本地存储空间不足：附件过大，请压缩图片或改用较小文件。')
  }
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const store = {
  problems: () => read<Problem>('problems', seedProblems),
  solutions: () => read<Solution>('solutions', seedSolutions),
  comments: () => read<Comment>('comments', seedComments),
  articles: () => readArticles(),
  papers: () => read<Paper>('papers', seedPapers),
  users: () => read<User>('users', []),

  addProblem(actor: Actor, p: Problem) {
    assertCanSubmitPublicContent(actor, 'problem')
    assertAttachmentsAllowed(actor, p.attachments)
    write('problems', [p, ...store.problems()])
  },
  addSolution(actor: Actor, s: Solution) {
    assertCanSubmitPublicContent(actor, 'solution')
    assertAttachmentsAllowed(actor, s.attachments)
    write('solutions', [s, ...store.solutions()])
  },
  addComment(c: Comment) {
    write('comments', [...store.comments(), c])
  },
  addArticle(actor: Actor, a: Article) {
    assertCanSubmitPublicContent(actor, 'article')
    const bundledIds = new Set(seedArticles.map((article) => article.id))
    const customArticles = store.articles().filter((article) => !bundledIds.has(article.id))
    write('articles', [a, ...customArticles])
  },
  addPaper(actor: Actor, p: Paper) {
    assertCanSubmitPublicContent(actor, 'paper')
    assertAttachmentsAllowed(actor, p.attachments)
    write('papers', [p, ...store.papers()])
  },
  addUser(u: User) {
    write('users', [...store.users(), u])
  },
  likeSolution(id: string) {
    write(
      'solutions',
      store.solutions().map((s) => (s.id === id ? { ...s, likes: s.likes + 1 } : s)),
    )
  },

  get session(): string | null {
    return localStorage.getItem(KEYS.session)
  },
  set session(userId: string | null) {
    if (userId) localStorage.setItem(KEYS.session, userId)
    else localStorage.removeItem(KEYS.session)
  },
}
