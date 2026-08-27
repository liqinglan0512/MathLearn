import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { inspectMathMarkup } from '../check-latex.mjs'
import { Markdown } from '../src/components/Markdown'
import { getArticleLearningProfile } from '../src/lib/learning'
import { seedArticles } from '../src/lib/seed'

describe('mathematical Markdown regression', () => {
  it('renders the epsilon quantifier in the limit article as KaTeX', () => {
    const article = seedArticles.find((candidate) => candidate.id === 'a3')
    expect(article).toBeDefined()
    const rigorous = getArticleLearningProfile(article!).abstraction.rigorous

    expect(rigorous).toContain('$\\varepsilon>0$')
    expect(inspectMathMarkup(rigorous)).toMatchObject({
      issues: [],
      spans: [{ tex: '\\varepsilon>0', displayMode: false }],
    })

    const html = renderToStaticMarkup(createElement(Markdown, { content: rigorous }))
    expect(html).toContain('<span class="katex">')
    expect(html).toContain('<mi>ε</mi>')
  })

  it('reports unclosed delimiters and common TeX commands left in prose', () => {
    const unclosed = inspectMathMarkup('对任意误差 $\\varepsilon>0，存在阈值。')
    expect(unclosed.issues.map((entry) => entry.kind)).toEqual([
      'unclosed_delimiter',
      'bare_tex',
    ])

    const bare = inspectMathMarkup('对任意误差 \\varepsilon>0，存在阈值。')
    expect(bare.issues.map((entry) => entry.kind)).toEqual(['bare_tex'])
  })

  it('does not treat currency or literal code as authored mathematics', () => {
    const audit = inspectMathMarkup('价格为 $1,000–2,000 元；代码示例是 `\\varepsilon`；公式是 $2x+1$。')
    expect(audit.issues).toEqual([])
    expect(audit.spans.map((span) => span.tex)).toEqual(['2x+1'])
  })
})
