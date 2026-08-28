export const GITHUB_REPOSITORY_URL = 'https://github.com/liqinglan0512/MathLearn'
export const GITHUB_ISSUES_URL = `${GITHUB_REPOSITORY_URL}/issues`

export const PUBLIC_NAVIGATION = [
  { kind: 'internal', to: '/principles', label: '理解数学' },
  { kind: 'internal', to: '/viz', label: '可视化' },
  { kind: 'internal', to: '/problems', label: '练习' },
  { kind: 'internal', to: '/tools', label: '工具' },
  { kind: 'external', to: GITHUB_REPOSITORY_URL, label: 'GitHub' },
] as const

export const OPEN_LEARNING_LOOP = [
  { id: 'understand', label: '理解', description: '从问题、定义与严格推理出发' },
  { id: 'visualize', label: '可视化', description: '亲手改变参数，看见数学结构' },
  { id: 'practice', label: '练习', description: '用少量好题检验是否真正理解' },
  { id: 'contribute', label: '开源', description: '通过 GitHub 一起改进解释与工具' },
] as const
