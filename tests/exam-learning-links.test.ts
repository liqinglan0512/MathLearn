import { describe, expect, it } from 'vitest'
import { parsePaperQuestions } from '../src/lib/exam'
import { seedPapers } from '../src/lib/seed'

describe('exam learning-link trust boundary', () => {
  it('does not turn broad question keywords into unreviewed precise links', () => {
    const probabilityPaper = seedPapers.find((paper) => paper.id === 'paper2')!
    const questions = parsePaperQuestions(probabilityPaper)
    const normalDistribution = questions.find((question) => question.title.includes('概率论'))!

    expect(normalDistribution.content).toMatch(/N\(0, 1\)/)
    expect(normalDistribution.articleIds).toEqual([])
    expect(normalDistribution.problemIds).toEqual([])
    expect(normalDistribution.labIds).toEqual([])
  })

  it('keeps all existing exam questions unlinked until mappings are curated', () => {
    for (const paper of seedPapers) {
      for (const question of parsePaperQuestions(paper)) {
        expect(question.articleIds).toEqual([])
        expect(question.problemIds).toEqual([])
        expect(question.labIds).toEqual([])
      }
    }
  })
})
