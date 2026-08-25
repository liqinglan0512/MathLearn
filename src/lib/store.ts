import type { Article, Comment, Problem, Solution, User } from './types'
import { seedArticles, seedProblems, seedSolutions, seedComments } from './seed'

const KEYS = {
  problems: 'mf_problems',
  solutions: 'mf_solutions',
  comments: 'mf_comments',
  articles: 'mf_articles',
  users: 'mf_users',
  session: 'mf_session',
}

type Key = keyof typeof KEYS

function read<T>(key: Key, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(KEYS[key])
    if (raw) return JSON.parse(raw) as T[]
  } catch {
    /* corrupted -> reseed */
  }
  localStorage.setItem(KEYS[key], JSON.stringify(seed))
  return [...seed]
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
  articles: () => read<Article>('articles', seedArticles),
  users: () => read<User>('users', []),

  addProblem(p: Problem) {
    write('problems', [p, ...store.problems()])
  },
  addSolution(s: Solution) {
    write('solutions', [s, ...store.solutions()])
  },
  addComment(c: Comment) {
    write('comments', [...store.comments(), c])
  },
  addArticle(a: Article) {
    write('articles', [a, ...store.articles()])
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
