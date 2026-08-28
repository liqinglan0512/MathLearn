import { getArticleLearningProfile, getPracticeIdsForConcept, listKnowledgeNodes } from './learning'
import type { LabId } from './labs'
import { seedArticles } from './seed'

export type LearningField =
  | 'calculus'
  | 'linear-algebra'
  | 'probability-statistics'
  | 'differential-equations'
  | 'number-theory'
  | 'analytic-geometry'

export type LearningLevel = 'foundation' | 'intermediate' | 'advanced'

/**
 * Curriculum visibility only. It does not claim mathematical review or
 * publication through the durable Content/Revision workflow.
 */
export type LearningUnitStatus = 'pilot' | 'active' | 'archived'

export interface LearningUnitDefinition {
  readonly id: string
  readonly title: string
  readonly field: LearningField
  readonly level: LearningLevel
  /** Existing reliable body; LearningUnit never owns or copies article prose. */
  readonly articleId: string
  /** Concepts actually taught by this unit. */
  readonly conceptIds: readonly string[]
  /** Concepts assumed before entering this unit. */
  readonly prerequisiteConceptIds: readonly string[]
  readonly visualizationIds: readonly LabId[]
  readonly status: LearningUnitStatus
  /**
   * Optional stable semantic-block pointer. It stays absent until a reviewed
   * formal-definition block really exists; no definition text is synthesized.
   */
  readonly formalDefinitionBlockId?: string
}

export interface LearningUnit extends LearningUnitDefinition {
  /** Reused from the existing article profile, never generated in this catalog. */
  readonly intuition: string
  /** Derived from ProblemConceptProfile.focusIds. */
  readonly practiceIds: readonly string[]
  /** Derived by reversing KnowledgeNode.prerequisiteIds. */
  readonly nextConceptIds: readonly string[]
  /** Derived from other units' prerequisiteConceptIds. */
  readonly nextUnitIds: readonly string[]
}

function defineUnit(definition: LearningUnitDefinition): LearningUnitDefinition {
  return Object.freeze({
    ...definition,
    conceptIds: Object.freeze([...definition.conceptIds]),
    prerequisiteConceptIds: Object.freeze([...definition.prerequisiteConceptIds]),
    visualizationIds: Object.freeze([...definition.visualizationIds]),
  })
}

export const LEARNING_UNIT_DEFINITIONS: readonly LearningUnitDefinition[] = Object.freeze([
  defineUnit({
    id: 'limit-definition',
    title: '极限的严格定义',
    field: 'calculus',
    level: 'foundation',
    articleId: 'a3',
    conceptIds: ['sequence-limit'],
    prerequisiteConceptIds: [],
    visualizationIds: [],
    status: 'pilot',
  }),
  defineUnit({
    id: 'stolz-cesaro',
    title: 'Stolz–Cesàro 定理',
    field: 'calculus',
    level: 'advanced',
    articleId: 'a12',
    conceptIds: ['stolz'],
    prerequisiteConceptIds: ['sequence-limit', 'monotonicity', 'asymptotic-order'],
    visualizationIds: [],
    status: 'pilot',
  }),
  defineUnit({
    id: 'mean-value-theorem',
    title: 'Rolle 与拉格朗日中值定理',
    field: 'calculus',
    level: 'intermediate',
    articleId: 'a13',
    conceptIds: ['rolle', 'mean-value'],
    prerequisiteConceptIds: ['derivative'],
    visualizationIds: ['derivative'],
    status: 'pilot',
  }),
  defineUnit({
    id: 'taylor-expansion',
    title: '泰勒展开与余项',
    field: 'calculus',
    level: 'intermediate',
    articleId: 'a1',
    conceptIds: ['taylor'],
    prerequisiteConceptIds: ['derivative', 'asymptotic-order'],
    visualizationIds: ['taylor'],
    status: 'pilot',
  }),
  defineUnit({
    id: 'riemann-integral',
    title: '黎曼积分与微积分基本定理',
    field: 'calculus',
    level: 'foundation',
    articleId: 'a6',
    conceptIds: ['riemann-integral', 'fundamental-theorem'],
    prerequisiteConceptIds: ['sequence-limit', 'derivative'],
    visualizationIds: ['integral'],
    status: 'pilot',
  }),
  defineUnit({
    id: 'cauchy-schwarz',
    title: '内积与 Cauchy–Schwarz 不等式',
    field: 'linear-algebra',
    level: 'foundation',
    articleId: 'a2',
    conceptIds: ['inner-product', 'cauchy-schwarz'],
    prerequisiteConceptIds: [],
    visualizationIds: [],
    status: 'pilot',
  }),
  defineUnit({
    id: 'determinant',
    title: '行列式与有向体积',
    field: 'linear-algebra',
    level: 'intermediate',
    articleId: 'a4',
    conceptIds: ['determinant'],
    prerequisiteConceptIds: ['linear-map'],
    visualizationIds: ['linear'],
    status: 'pilot',
  }),
  defineUnit({
    id: 'eigenvalues-eigenvectors',
    title: '特征值与特征向量',
    field: 'linear-algebra',
    level: 'intermediate',
    articleId: 'a5',
    conceptIds: ['eigenvector'],
    prerequisiteConceptIds: ['linear-map'],
    visualizationIds: ['linear'],
    status: 'pilot',
  }),
  defineUnit({
    id: 'bayes-theorem',
    title: '条件概率与贝叶斯公式',
    field: 'probability-statistics',
    level: 'foundation',
    articleId: 'a7',
    conceptIds: ['conditional-probability'],
    prerequisiteConceptIds: ['probability'],
    visualizationIds: [],
    status: 'pilot',
  }),
  defineUnit({
    id: 'maximum-likelihood',
    title: '最大似然估计',
    field: 'probability-statistics',
    level: 'intermediate',
    articleId: 'a8',
    conceptIds: ['likelihood', 'optimization'],
    prerequisiteConceptIds: ['probability', 'derivative'],
    visualizationIds: [],
    status: 'pilot',
  }),
  defineUnit({
    id: 'random-walk-hitting-time',
    title: '随机游动与首达时',
    field: 'probability-statistics',
    level: 'advanced',
    articleId: 'a14',
    conceptIds: ['random-walk', 'stopping-time'],
    prerequisiteConceptIds: ['probability'],
    visualizationIds: [],
    status: 'pilot',
  }),
  defineUnit({
    id: 'first-order-linear-ode',
    title: '一阶线性微分方程',
    field: 'differential-equations',
    level: 'intermediate',
    articleId: 'a9',
    conceptIds: ['differential-equation', 'integrating-factor'],
    prerequisiteConceptIds: ['derivative', 'fundamental-theorem'],
    visualizationIds: ['ode'],
    status: 'pilot',
  }),
  defineUnit({
    id: 'gcd-bezout',
    title: '最大公因数与裴蜀定理',
    field: 'number-theory',
    level: 'foundation',
    articleId: 'a10',
    conceptIds: ['gcd'],
    prerequisiteConceptIds: [],
    visualizationIds: [],
    status: 'pilot',
  }),
  defineUnit({
    id: 'conic-eccentricity',
    title: '圆锥曲线与离心率',
    field: 'analytic-geometry',
    level: 'foundation',
    articleId: 'a11',
    conceptIds: ['ellipse', 'polar-coordinate'],
    prerequisiteConceptIds: [],
    visualizationIds: ['plotter'],
    status: 'pilot',
  }),
])

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

function resolveLearningUnit(definition: LearningUnitDefinition): LearningUnit {
  const article = seedArticles.find((candidate) => candidate.id === definition.articleId)
  if (!article) {
    throw new Error('LearningUnit ' + definition.id + ' references missing article ' + definition.articleId + '.')
  }

  const practiceIds = unique(definition.conceptIds.flatMap(getPracticeIdsForConcept))
  const nextConceptIds = listKnowledgeNodes()
    .filter((node) => !definition.conceptIds.includes(node.id)
      && node.prerequisiteIds.some((conceptId) => definition.conceptIds.includes(conceptId)))
    .map((node) => node.id)
  const nextUnitIds = LEARNING_UNIT_DEFINITIONS
    .filter((candidate) => candidate.id !== definition.id
      && candidate.prerequisiteConceptIds.some((conceptId) => definition.conceptIds.includes(conceptId)))
    .map((candidate) => candidate.id)

  return Object.freeze({
    ...definition,
    intuition: getArticleLearningProfile(article).abstraction.intuition,
    practiceIds: Object.freeze(practiceIds),
    nextConceptIds: Object.freeze(nextConceptIds),
    nextUnitIds: Object.freeze(nextUnitIds),
  })
}

export function listLearningUnits(): readonly LearningUnit[] {
  return Object.freeze(LEARNING_UNIT_DEFINITIONS.map(resolveLearningUnit))
}

export function getLearningUnit(id: string): LearningUnit | undefined {
  const definition = LEARNING_UNIT_DEFINITIONS.find((candidate) => candidate.id === id)
  return definition ? resolveLearningUnit(definition) : undefined
}

export function getLearningUnitByArticleId(articleId: string): LearningUnit | undefined {
  const definition = LEARNING_UNIT_DEFINITIONS.find((candidate) => candidate.articleId === articleId)
  return definition ? resolveLearningUnit(definition) : undefined
}

export function getLearningUnitsForConcept(conceptId: string): readonly LearningUnit[] {
  return listLearningUnits().filter((unit) => unit.conceptIds.includes(conceptId))
}

export function getLearningUnitsForVisualization(labId: LabId): readonly LearningUnit[] {
  return listLearningUnits().filter((unit) => unit.visualizationIds.includes(labId))
}

const PRIMARY_VISUALIZATION_UNIT: Readonly<Partial<Record<LabId, string>>> = Object.freeze({
  derivative: 'mean-value-theorem',
  integral: 'riemann-integral',
  linear: 'determinant',
  taylor: 'taylor-expansion',
  ode: 'first-order-linear-ode',
  plotter: 'conic-eccentricity',
})

/**
 * Editorial choice among units already related to a lab. Some labs cover more
 * than one concept, so public navigation must not depend on array order.
 */
export function getPrimaryLearningUnitForVisualization(labId: LabId): LearningUnit | undefined {
  const unitId = PRIMARY_VISUALIZATION_UNIT[labId]
  if (!unitId) return undefined
  const unit = getLearningUnit(unitId)
  return unit?.visualizationIds.includes(labId) ? unit : undefined
}
