import { describe, expect, it } from 'vitest'
import {
  LEARNING_UNIT_DEFINITIONS,
  getLearningUnit,
  getLearningUnitByArticleId,
  getPrimaryLearningUnitForVisualization,
  getLearningUnitsForConcept,
  getLearningUnitsForVisualization,
  listLearningUnits,
} from '../src/lib/learning-units'
import { getArticleLearningProfile, getKnowledgeNode, getPracticeIdsForConcept } from '../src/lib/learning'
import { MATH_LABS } from '../src/lib/labs'
import { seedArticles, seedProblems } from '../src/lib/seed'

describe('Open Learning Core unit catalog', () => {
  it('maps all fourteen existing articles as pilot metadata without copying prose', () => {
    const units = listLearningUnits()
    const articleIds = seedArticles.map((article) => article.id).sort()

    expect(units).toHaveLength(14)
    expect(units.map((unit) => unit.articleId).sort()).toEqual(articleIds)
    expect(units.every((unit) => unit.status === 'pilot')).toBe(true)
    expect(new Set(units.map((unit) => unit.id)).size).toBe(units.length)
    expect(new Set(units.map((unit) => unit.articleId)).size).toBe(units.length)
    expect(Object.isFrozen(LEARNING_UNIT_DEFINITIONS)).toBe(true)

    for (const definition of LEARNING_UNIT_DEFINITIONS) {
      expect('content' in definition).toBe(false)
      expect('formalDefinition' in definition).toBe(false)
      expect(definition.formalDefinitionBlockId).toBeUndefined()
      expect(definition.articleId.startsWith('euclid-')).toBe(false)
    }
  })

  it('resolves intuition from the existing article profile and keeps every reference valid', () => {
    const labIds = new Set(MATH_LABS.map((lab) => lab.id))
    const problemIds = new Set(seedProblems.map((problem) => problem.id))

    for (const unit of listLearningUnits()) {
      const article = seedArticles.find((candidate) => candidate.id === unit.articleId)
      expect(article).toBeDefined()
      expect(unit.intuition).toBe(getArticleLearningProfile(article!).abstraction.intuition)

      const concepts = [...unit.conceptIds, ...unit.prerequisiteConceptIds]
      expect(new Set(unit.conceptIds).size).toBe(unit.conceptIds.length)
      expect(new Set(unit.prerequisiteConceptIds).size).toBe(unit.prerequisiteConceptIds.length)
      expect(unit.conceptIds.some((conceptId) => unit.prerequisiteConceptIds.includes(conceptId))).toBe(false)
      for (const conceptId of concepts) expect(getKnowledgeNode(conceptId)).toBeDefined()
      for (const labId of unit.visualizationIds) expect(labIds.has(labId)).toBe(true)
      for (const problemId of unit.practiceIds) expect(problemIds.has(problemId)).toBe(true)
    }
  })

  it('derives practice and next-unit relationships instead of duplicating them', () => {
    const units = listLearningUnits()
    const byId = new Map(units.map((unit) => [unit.id, unit]))

    for (const unit of units) {
      const expectedPracticeIds = [...new Set(unit.conceptIds.flatMap(getPracticeIdsForConcept))]
      expect(unit.practiceIds).toEqual(expectedPracticeIds)

      for (const nextConceptId of unit.nextConceptIds) {
        expect(unit.conceptIds).not.toContain(nextConceptId)
        const nextConcept = getKnowledgeNode(nextConceptId)
        expect(nextConcept).toBeDefined()
        expect(nextConcept!.prerequisiteIds.some((conceptId) => unit.conceptIds.includes(conceptId))).toBe(true)
      }

      for (const nextUnitId of unit.nextUnitIds) {
        const next = byId.get(nextUnitId)
        expect(next).toBeDefined()
        expect(nextUnitId).not.toBe(unit.id)
        expect(next!.prerequisiteConceptIds.some((conceptId) => unit.conceptIds.includes(conceptId))).toBe(true)
      }
    }

    expect(getLearningUnit('stolz-cesaro')?.practiceIds).toEqual(['p1'])
    expect(getLearningUnit('taylor-expansion')?.practiceIds).toEqual([])
    expect(getLearningUnit('cauchy-schwarz')?.practiceIds).toEqual(['p2'])
    expect(getLearningUnit('random-walk-hitting-time')?.practiceIds).toEqual(['p8'])
    expect(getLearningUnit('maximum-likelihood')?.practiceIds).toEqual([])
    expect(getLearningUnit('gcd-bezout')?.practiceIds).toEqual([])
    expect(getLearningUnit('limit-definition')?.nextConceptIds).toContain('derivative')
    expect(getLearningUnit('riemann-integral')?.nextUnitIds).toContain('first-order-linear-ode')
  })

  it('supports lookup by article, concept and visualization', () => {
    expect(getLearningUnitByArticleId('a3')?.id).toBe('limit-definition')
    expect(getLearningUnitByArticleId('euclid-1-47')).toBeUndefined()
    expect(getLearningUnitsForConcept('determinant').map((unit) => unit.id)).toEqual(['determinant'])
    expect(getLearningUnitsForVisualization('linear').map((unit) => unit.id)).toEqual([
      'determinant',
      'eigenvalues-eigenvectors',
    ])
    expect(getPrimaryLearningUnitForVisualization('linear')?.id).toBe('determinant')
    expect(getPrimaryLearningUnitForVisualization('probability')).toBeUndefined()
  })

  it('does not overstate what the existing Taylor and GCD articles directly teach', () => {
    expect(getLearningUnit('taylor-expansion')?.conceptIds).toEqual(['taylor'])
    expect(getLearningUnit('gcd-bezout')?.conceptIds).toEqual(['gcd'])
  })
})

describe('canonical laboratory metadata', () => {
  it('defines seven unique labs with all three learner prompts', () => {
    expect(MATH_LABS).toHaveLength(7)
    expect(new Set(MATH_LABS.map((lab) => lab.id)).size).toBe(7)

    for (const lab of MATH_LABS) {
      expect(lab.guidance.observe.trim()).not.toBe('')
      expect(lab.guidance.change.trim()).not.toBe('')
      expect(lab.guidance.notice.trim()).not.toBe('')
    }
  })

  it('does not claim that the central-limit experiment explains the random-walk article', () => {
    expect(MATH_LABS.every((lab) => !('articleId' in lab))).toBe(true)
    expect(getLearningUnitsForVisualization('probability')).toEqual([])
  })
})
