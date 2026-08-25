export type Difficulty = '入门' | '基础' | '提高' | '冲刺' | '决赛'
export type Chapter =
  | '数学分析'
  | '高等代数'
  | '线性代数'
  | '高等数学'
  | '解析几何'
  | '组合数学'
  | '数论'
  | '概率论'
  | '数理统计'
  | '概率统计'
  | '常微分方程'
export type Competition = '全国大学生数学竞赛' | '各省赛区预赛' | '数学建模竞赛' | '丘成桐大学生数学竞赛' | '考研数学'

export interface Paper {
  id: string
  title: string
  competition: Competition
  year: number
  description: string
  content: string // Markdown + LaTeX 整卷/套题内容
  attachments: Attachment[]
  createdAt: number
  authorId: string
  authorName: string
}


export interface Problem {
  id: string
  title: string
  statement: string // Markdown + LaTeX
  chapter: Chapter
  difficulty: Difficulty
  competition: Competition
  tags: string[]
  attachments: Attachment[]
  createdAt: number
  authorId: string
}

export interface Attachment {
  name: string
  type: 'image' | 'pdf'
  dataUrl: string
}

export interface Solution {
  id: string
  problemId: string
  authorId: string
  authorName: string
  content: string // Markdown + LaTeX
  attachments: Attachment[]
  createdAt: number
  likes: number
}

export interface Comment {
  id: string
  targetId: string // problemId or solutionId
  authorId: string
  authorName: string
  content: string
  createdAt: number
}

export interface Article {
  id: string
  title: string
  summary: string
  content: string // Markdown + LaTeX 长文
  topic: Chapter
  authorId: string
  authorName: string
  createdAt: number
}

export interface User {
  id: string
  name: string
  account: string // 邮箱或手机号
  password: string // demo 级存储，正式环境必须后端哈希
  isAdmin: boolean
  createdAt: number
}

export const CHAPTERS: Chapter[] = [
  '数学分析',
  '高等代数',
  '线性代数',
  '高等数学',
  '解析几何',
  '组合数学',
  '数论',
  '概率论',
  '数理统计',
  '常微分方程',
]
export const DIFFICULTIES: Difficulty[] = ['入门', '基础', '提高', '冲刺', '决赛']
export const COMPETITIONS: Competition[] = ['全国大学生数学竞赛', '各省赛区预赛', '数学建模竞赛', '丘成桐大学生数学竞赛', '考研数学']
