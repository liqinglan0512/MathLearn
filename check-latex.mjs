// 用 KaTeX 校验种子内容里所有 $...$ / $$...$$ 公式能否正常渲染
import katex from 'katex'
import { readFileSync } from 'fs'
import ts from 'typescript'

// 简单处理：把 seed.ts 编译成 js 再导入
const src = readFileSync('src/lib/seed.ts', 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: 'CommonJS' } }).outputText
const { createRequire } = await import('module'); const require2 = createRequire(import.meta.url); const mod = { exports: {} }
new Function('exports', 'require', 'module', js)(mod.exports, require2, mod)
const { seedProblems, seedSolutions, seedArticles, seedComments, seedPapers } = mod.exports

const mathRe = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
let errors = 0
let total = 0
function check(tag, text) {
  let m
  while ((m = mathRe.exec(text))) {
    const tex = (m[1] ?? m[2]).trim()
    total++
    try {
      katex.renderToString(tex, { displayMode: !!m[1], throwOnError: true })
    } catch (e) {
      errors++
      console.log(`[FAIL] ${tag}: ${tex.slice(0, 80)}\n       ${e.message}`)
    }
  }
}
seedProblems.forEach((p) => check('problem:' + p.id, p.statement))
seedSolutions.forEach((s) => check('solution:' + s.id, s.content))
seedArticles.forEach((a) => check('article:' + a.id, a.content + '\n' + a.summary))
seedComments.forEach((c) => check('comment:' + c.id, c.content))
seedPapers.forEach((p) => check('paper:' + p.id, p.content + '\n' + p.description))
console.log(`\nchecked ${total} formulas, ${errors} errors`)
