export interface EuclidEnrichmentItem {
  id: string
  title: string
  content: string
  citations: string[]
  revision: {
    id: string
    version: number
    status: 'raw_machine'
  }
  provenance: {
    kind: 'editorial_supplement'
    createdBy: string
    note: string
  }
}

export interface EuclidEnrichment {
  modernExplanation: EuclidEnrichmentItem
  alternativeProofs: EuclidEnrichmentItem[]
  commonErrors: EuclidEnrichmentItem[]
}

const PYTHAGORAS_ENRICHMENT: EuclidEnrichment = {
  modernExplanation: {
    id: 'euclid-1-47.modern',
    title: '现代重述：内积中的正交分解',
    content: [
      '在已经给定内积结构的向量空间中，若 $\\langle u,v\\rangle=0$，则',
      '$$\\lVert u+v\\rVert^2=\\langle u+v,u+v\\rangle=\\lVert u\\rVert^2+2\\langle u,v\\rangle+\\lVert v\\rVert^2=\\lVert u\\rVert^2+\\lVert v\\rVert^2.$$',
      '这解释了勾股关系为何推广到任意内积空间。它是采用现代内积公理后的结构性重述；如果用欧氏距离公式建立内积，则不能反过来宣称已经独立证明了欧几里得的原命题。',
    ].join('\n\n'),
    citations: [],
    revision: { id: 'euclid-1-47.modern.v1', version: 1, status: 'raw_machine' },
    provenance: {
      kind: 'editorial_supplement',
      createdBy: 'mathforge-editorial-draft',
      note: '站内补充草稿；不属于 Heath 底本，尚未经过人工数学审核。',
    },
  },
  alternativeProofs: [
    {
      id: 'euclid-1-47.alternative.area-dissection',
      title: '面积拼图证明：四个全等直角三角形',
      content: [
        '设直角三角形两条直角边长为 $a,b$，斜边长为 $c$。把四个全等的直角三角形按顺序放入边长为 $a+b$ 的大正方形。',
        '中间留下的四边形四条边都长 $c$。由[三角形内角和定理](/principles/euclid-1-32)，每个直角三角形的两个锐角之和为直角，因此中间四边形的每个角也是直角；它确实是边长为 $c$ 的正方形，而不能只凭图形看起来像正方形。',
        '由[同底同高的面积关系](/principles/euclid-1-41)，每个三角形面积为 $ab/2$。于是大正方形的面积满足',
        '$$(a+b)^2=4\\cdot\\frac{ab}{2}+c^2.$$',
        '利用[完全平方公式的几何形式](/principles/euclid-2-4)，整理得到',
        '$$\\boxed{a^2+b^2=c^2}.$$',
        '这条证明依赖面积可加、拼图没有缝隙或重叠，以及中间四边形的直角判定；这些条件必须明确。',
      ].join('\n\n'),
      citations: ['euclid-1-32', 'euclid-1-41', 'euclid-2-4'],
      revision: { id: 'euclid-1-47.alternative.area-dissection.v1', version: 1, status: 'raw_machine' },
      provenance: {
        kind: 'editorial_supplement',
        createdBy: 'mathforge-editorial-draft',
        note: '站内补充草稿；不属于 Heath 底本，尚未经过人工数学审核。',
      },
    },
  ],
  commonErrors: [
    {
      id: 'euclid-1-47.error.figure',
      title: '把图上看起来是正方形当成证明',
      content: '必须另外证明中间四边形四条边都等于斜边，而且四个角都为直角；视觉印象不能代替角度推理。',
      citations: [],
      revision: { id: 'euclid-1-47.error.figure.v1', version: 1, status: 'raw_machine' },
      provenance: {
        kind: 'editorial_supplement', createdBy: 'mathforge-editorial-draft',
        note: '站内补充草稿；不属于 Heath 底本，尚未经过人工数学审核。',
      },
    },
    {
      id: 'euclid-1-47.error.circular-distance',
      title: '直接使用平面距离公式形成循环论证',
      content: '若距离公式本身依赖勾股定理，用它证明勾股定理就是循环论证；采用坐标或内积时必须明确哪些结构是额外公理。',
      citations: [],
      revision: { id: 'euclid-1-47.error.circular-distance.v1', version: 1, status: 'raw_machine' },
      provenance: {
        kind: 'editorial_supplement', createdBy: 'mathforge-editorial-draft',
        note: '站内补充草稿；不属于 Heath 底本，尚未经过人工数学审核。',
      },
    },
    {
      id: 'euclid-1-47.error.right-angle',
      title: '漏掉直角前提',
      content: '任意三角形通常满足余弦定理；只有夹角是直角时，交叉项才消失并得到勾股关系。',
      citations: [],
      revision: { id: 'euclid-1-47.error.right-angle.v1', version: 1, status: 'raw_machine' },
      provenance: {
        kind: 'editorial_supplement', createdBy: 'mathforge-editorial-draft',
        note: '站内补充草稿；不属于 Heath 底本，尚未经过人工数学审核。',
      },
    },
    {
      id: 'euclid-1-47.error.area',
      title: '没有说明拼图恰好覆盖且不重叠',
      content: '面积拆分等式要求四个三角形和中央正方形的内部互不重叠，并共同覆盖外部正方形。',
      citations: [],
      revision: { id: 'euclid-1-47.error.area.v1', version: 1, status: 'raw_machine' },
      provenance: {
        kind: 'editorial_supplement', createdBy: 'mathforge-editorial-draft',
        note: '站内补充草稿；不属于 Heath 底本，尚未经过人工数学审核。',
      },
    },
  ],
}

export function getEuclidEnrichment(id: string): EuclidEnrichment | undefined {
  return id === 'euclid-1-47' ? PYTHAGORAS_ENRICHMENT : undefined
}
