import type { Paper } from './types'

export type ExamErrorReason = 'knowledge' | 'calculation' | 'logic' | 'time'
export type ExamStatus = 'idle' | 'running' | 'paused' | 'finished'

export interface ExamRubricItem {
  id: string
  label: string
  points: number
}

export interface ExamQuestion {
  id: string
  title: string
  content: string
  points: number
  rubric: ExamRubricItem[]
  articleIds: string[]
  problemIds: string[]
  labIds: string[]
}

export interface ExamSession {
  paperId: string
  status: ExamStatus
  activeQuestion: number
  secondsByQuestion: number[]
  checksByQuestion: Record<string, string[]>
  errorsByQuestion: Record<string, ExamErrorReason | undefined>
  startedAt: number | null
  lastTickAt: number | null
  finishedAt: number | null
}

export const ERROR_REASONS: { id: ExamErrorReason; label: string }[] = [
  { id: 'knowledge', label: '知识缺口' },
  { id: 'calculation', label: '计算失误' },
  { id: 'logic', label: '逻辑缺口' },
  { id: 'time', label: '时间分配' },
]

const RUBRIC_LABELS = ['找到关键构造', '证明中间步骤', '使用定理并核对条件', '完整写出结论']

function buildRubric(points: number): ExamRubricItem[] {
  const basePoints = Math.floor(points / RUBRIC_LABELS.length)
  const remainder = points % RUBRIC_LABELS.length

  return RUBRIC_LABELS.map((label, index) => ({
    id: `step-${index + 1}`,
    label,
    points: basePoints + (index < remainder ? 1 : 0),
  })).filter((item) => item.points > 0)
}

function unique(items: string[]) {
  return [...new Set(items)]
}

function learningLinks(title: string, content: string) {
  const text = `${title} ${content}`
  const articleIds: string[] = []
  const problemIds: string[] = []
  const labIds: string[] = []

  if (/积分|黎曼|曲边|面积/.test(text)) {
    articleIds.push('a6')
    problemIds.push('p2', 'p7')
    labIds.push('integral')
  }
  if (/极限|级数|Stolz|洛必达/.test(text)) {
    articleIds.push('a3', 'a1')
    problemIds.push('p1', 'p7')
    labIds.push('taylor', 'derivative')
  }
  if (/矩阵|特征|向量|线性|对称/.test(text)) {
    articleIds.push('a4', 'a5')
    problemIds.push('p3')
    labIds.push('linear')
  }
  if (/概率|随机|分布|正态/.test(text)) {
    articleIds.push('a7')
    problemIds.push('p8')
    labIds.push('probability')
  }
  if (/统计|似然|估计/.test(text)) {
    articleIds.push('a8')
    problemIds.push('p8')
    labIds.push('probability')
  }
  if (/微分方程|积分因子|初值/.test(text)) {
    articleIds.push('a9')
    labIds.push('ode')
  }
  if (/椭圆|圆锥|几何|直线|空间/.test(text)) {
    articleIds.push('a11')
    problemIds.push('p4')
    labIds.push('plotter')
  }
  if (/素数|同余|数论/.test(text)) {
    articleIds.push('a10')
    problemIds.push('p6')
  }

  return {
    articleIds: unique(articleIds).slice(0, 3),
    problemIds: unique(problemIds).slice(0, 3),
    labIds: unique(labIds).slice(0, 2),
  }
}

export function parsePaperQuestions(paper: Paper): ExamQuestion[] {
  const headers = [...paper.content.matchAll(/^##\s+(.+)$/gm)]
  if (headers.length === 0) {
    return [
      {
        id: `${paper.id}-q1`,
        title: '完整试卷',
        content: paper.content,
        points: 100,
        rubric: buildRubric(100),
        ...learningLinks(paper.title, paper.content),
      },
    ]
  }

  return headers.map((header, index) => {
    const title = header[1].trim()
    const start = (header.index ?? 0) + header[0].length
    const end = headers[index + 1]?.index ?? paper.content.length
    const content = paper.content.slice(start, end).trim()
    const scoreMatch = title.match(/[（(]\s*(\d+)\s*分\s*[）)]/)
    const points = scoreMatch ? Number(scoreMatch[1]) : Math.round(100 / headers.length)

    return {
      id: `${paper.id}-q${index + 1}`,
      title,
      content,
      points,
      rubric: buildRubric(points),
      ...learningLinks(title, content),
    }
  })
}

export function recommendedMinutes(paper: Paper, questionCount: number) {
  const description = `${paper.description}\n${paper.content.slice(0, 180)}`
  const match = description.match(/建议用时\s*(\d+)\s*分钟/)
  return match ? Number(match[1]) : questionCount * 20
}

export function createExamSession(paperId: string, questionCount: number): ExamSession {
  return {
    paperId,
    status: 'idle',
    activeQuestion: 0,
    secondsByQuestion: Array.from({ length: questionCount }, () => 0),
    checksByQuestion: {},
    errorsByQuestion: {},
    startedAt: null,
    lastTickAt: null,
    finishedAt: null,
  }
}

function storageKey(paperId: string) {
  return `mf_exam_session_${paperId}`
}

export function loadExamSession(paperId: string, questionCount: number) {
  try {
    const raw = localStorage.getItem(storageKey(paperId))
    if (!raw) return createExamSession(paperId, questionCount)
    const parsed = JSON.parse(raw) as Partial<ExamSession>

    if (
      parsed.paperId !== paperId ||
      !Array.isArray(parsed.secondsByQuestion) ||
      parsed.secondsByQuestion.length !== questionCount ||
      !['idle', 'running', 'paused', 'finished'].includes(parsed.status ?? '')
    ) {
      return createExamSession(paperId, questionCount)
    }

    return parsed as ExamSession
  } catch {
    return createExamSession(paperId, questionCount)
  }
}

export function persistExamSession(session: ExamSession) {
  try {
    localStorage.setItem(storageKey(session.paperId), JSON.stringify(session))
  } catch {
    // 存储配额不足时，计时仍可在当前页面内继续。
  }
  return session
}

export function advanceExamClock(session: ExamSession, timestamp: number): ExamSession {
  if (session.status !== 'running' || session.lastTickAt === null) return session

  const seconds = Math.floor((timestamp - session.lastTickAt) / 1000)
  if (seconds < 1) return session

  return {
    ...session,
    lastTickAt: session.lastTickAt + seconds * 1000,
    secondsByQuestion: session.secondsByQuestion.map((current, index) =>
      index === session.activeQuestion ? current + seconds : current,
    ),
  }
}

export function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainder = safeSeconds % 60
  const clock = `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${clock}` : clock
}

export function questionScore(question: ExamQuestion, session: ExamSession) {
  const checked = session.checksByQuestion[question.id] ?? []
  return question.rubric.reduce((total, item) => total + (checked.includes(item.id) ? item.points : 0), 0)
}
