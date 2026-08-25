import { CHAPTERS, type Chapter } from './types'

const CHAPTER_SET = new Set<string>(CHAPTERS)

/**
 * 迁移旧的宽泛学科分类，同时保留访客此前创建的题目和文章。
 * 已经属于新分类的条目保持原样，不根据标题悄悄重新归类。
 */
export function normalizeChapter(
  chapter: string,
  title: string,
  tags: readonly string[] = [],
): Chapter {
  if (CHAPTER_SET.has(chapter)) return chapter as Chapter
  if (chapter === '线性代数' || chapter === '高等代数') return '代数'

  const description = `${title} ${tags.join(' ')}`
  if (/偏微分方程|PDE/i.test(description)) return '偏微分方程'
  if (/偏导(?:数)?/.test(description)) return '偏导数'
  if (/多元函数/.test(description)) return '多元函数'
  if (/数列|级数|Stolz/i.test(description)) return '数列'
  if (/极限/.test(description)) return '极限'
  if (/常微分方程|ODE/i.test(description)) return '常微分方程'
  if (/泰勒|导数|微分|中值/.test(description)) return '导数'
  if (/集合/.test(description)) return '集合'
  if (/拓扑/.test(description)) return '拓扑'
  if (/排列|组合/.test(description)) return '排列组合'

  return '函数'
}
