import { describe, expect, it } from 'vitest'
import {
  getKnowledgeNode,
  getPracticeIdsForConcept,
  getProblemIdsUsingConcept,
  listKnowledgeNodes,
  listSeedProblemConceptProfiles,
  matchesProblemLearningQuery,
} from '../src/lib/learning'
import { seedProblems } from '../src/lib/seed'

const EXPECTED_RELATIONS = {
  p1: {
    prerequisiteIds: ['sequence-limit', 'monotonicity', 'asymptotic-order', 'stolz'],
    focusIds: ['asymptotic-order', 'stolz'],
    extensionIds: [],
  },
  p2: {
    prerequisiteIds: ['inner-product', 'cauchy-schwarz', 'riemann-integral', 'fundamental-theorem'],
    focusIds: ['cauchy-schwarz', 'fundamental-theorem'],
    extensionIds: [],
  },
  p3: {
    prerequisiteIds: ['linear-map', 'dimension', 'matrix-rank'],
    focusIds: ['matrix-rank'],
    extensionIds: [],
  },
  p4: {
    prerequisiteIds: ['ellipse', 'polar-coordinate'],
    focusIds: ['polar-coordinate'],
    extensionIds: [],
  },
  p5: {
    prerequisiteIds: ['permutation', 'inclusion-exclusion', 'power-series'],
    focusIds: ['inclusion-exclusion', 'power-series'],
    extensionIds: [],
  },
  p6: {
    prerequisiteIds: ['modular-arithmetic', 'gcd', 'multiplicative-inverse', 'primality'],
    focusIds: ['multiplicative-inverse', 'primality'],
    extensionIds: [],
  },
  p7: {
    prerequisiteIds: ['sequence-limit', 'monotonicity', 'positive-series', 'riemann-integral', 'integral-test'],
    focusIds: ['integral-test'],
    extensionIds: [],
  },
  p8: {
    prerequisiteIds: ['probability', 'random-walk', 'stopping-time'],
    focusIds: ['random-walk', 'stopping-time'],
    extensionIds: ['conditional-probability', 'martingale'],
  },
} as const

describe('problem and concept relationships', () => {
  it('assigns one canonical role profile to every bundled problem', () => {
    const profiles = listSeedProblemConceptProfiles()
    expect(profiles.map((profile) => profile.problemId)).toEqual(seedProblems.map((problem) => problem.id))

    for (const profile of profiles) {
      const expected = EXPECTED_RELATIONS[profile.problemId as keyof typeof EXPECTED_RELATIONS]
      expect(profile).toEqual({ problemId: profile.problemId, ...expected })
      expect(new Set(profile.prerequisiteIds).size).toBe(profile.prerequisiteIds.length)
      expect(new Set(profile.focusIds).size).toBe(profile.focusIds.length)
      expect(new Set(profile.extensionIds).size).toBe(profile.extensionIds.length)
      expect(profile.focusIds.every((conceptId) => profile.prerequisiteIds.includes(conceptId))).toBe(true)
      expect(profile.extensionIds.some((conceptId) => profile.prerequisiteIds.includes(conceptId))).toBe(false)

      for (const conceptId of [...profile.prerequisiteIds, ...profile.extensionIds]) {
        expect(getKnowledgeNode(conceptId)).toBeDefined()
      }
    }
  })

  it('derives both reverse directions from the canonical role profiles', () => {
    const profiles = listSeedProblemConceptProfiles()

    for (const concept of listKnowledgeNodes()) {
      const expectedPractice = profiles
        .filter((profile) => profile.focusIds.includes(concept.id))
        .map((profile) => profile.problemId)
      const expectedUsage = profiles
        .filter((profile) => profile.prerequisiteIds.includes(concept.id))
        .map((profile) => profile.problemId)

      expect(getPracticeIdsForConcept(concept.id)).toEqual(expectedPractice)
      expect(getProblemIdsUsingConcept(concept.id)).toEqual(expectedUsage)
    }
  })

  it('does not turn broad or optional relationships into direct practice', () => {
    expect(getPracticeIdsForConcept('probability')).toEqual([])
    expect(getPracticeIdsForConcept('conditional-probability')).toEqual([])
    expect(getPracticeIdsForConcept('martingale')).toEqual([])
    expect(getPracticeIdsForConcept('random-walk')).toEqual(['p8'])
    expect(getProblemIdsUsingConcept('sequence-limit')).toEqual(['p1', 'p7'])
  })

  it('lets visualization search parameters match visible problem metadata', () => {
    const randomWalk = seedProblems.find((problem) => problem.id === 'p8')!
    expect(matchesProblemLearningQuery(randomWalk, '概率')).toBe(true)
    expect(matchesProblemLearningQuery(randomWalk, '冲刺')).toBe(true)
    expect(matchesProblemLearningQuery(randomWalk, '首达时')).toBe(true)
    expect(matchesProblemLearningQuery(randomWalk, '线性代数')).toBe(false)
  })
})
