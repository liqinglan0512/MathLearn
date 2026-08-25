// 用 KaTeX 校验正文、分层导读、提示、讨论与欧几里得证明块中的全部公式。
import katex from 'katex'
import { buildSync } from 'esbuild'

// 打包本地 TypeScript/JSON 依赖，保证新增典籍语料也参与相同的公式核验。
const output = buildSync({
  stdin: {
    contents: [
      "export * from './src/lib/seed.ts'",
      "export { getArticleLearningProfile, getProblemLearningProfile } from './src/lib/learning.ts'",
      "export { getEuclidBlocks, getEuclidEnrichment } from './src/lib/euclid.ts'",
    ].join('\n'),
    resolveDir: process.cwd(),
    sourcefile: 'mathforge-latex-audit.ts',
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  loader: { '.json': 'text' },
  write: false,
  logLevel: 'silent',
}).outputFiles[0].text
const { createRequire } = await import('module')
const requireModule = createRequire(import.meta.url)
const bundledModule = { exports: {} }
new Function('exports', 'require', 'module', output)(bundledModule.exports, requireModule, bundledModule)
const {
  seedProblems,
  seedSolutions,
  seedArticles,
  seedComments,
  seedPapers,
  getArticleLearningProfile,
  getProblemLearningProfile,
  getEuclidBlocks,
  getEuclidEnrichment,
} = bundledModule.exports

const mathRe = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\\)\$([^$\n]+?)(?<!\\)\$/g
let errors = 0
let total = 0
function check(tag, text) {
  let m
  while ((m = mathRe.exec(text))) {
    const tex = (m[1] ?? m[2] ?? m[3] ?? m[4]).trim()
    total++
    try {
      katex.renderToString(tex, { displayMode: !!(m[1] ?? m[2]), throwOnError: true })
    } catch (e) {
      errors++
      console.log(`[FAIL] ${tag}: ${tex.slice(0, 80)}\n       ${e.message}`)
    }
  }
}
seedProblems.forEach((p) => {
  check('problem:' + p.id, p.statement)
  const profile = getProblemLearningProfile(p)
  check('problem-profile:' + p.id, profile.summary)
  profile.hints.forEach((hint, index) => check(`problem-hint:${p.id}:${index}`, `${hint.title}\n${hint.content}`))
})
seedSolutions.forEach((s) => check('solution:' + s.id, s.content))
seedArticles.forEach((a) => {
  check('article:' + a.id, a.content + '\n' + a.summary)

  const profile = getArticleLearningProfile(a)
  check(
    'article-profile:' + a.id,
    [
      profile.framingQuestion,
      ...Object.values(profile.abstraction),
      ...profile.conditionChecks,
      profile.counterexample ?? '',
    ].join('\n'),
  )

  getEuclidBlocks(a.id).forEach((block) => {
    check(`euclid-block:${block.id}`, block.content)
    if (block.originalContent) check(`euclid-original:${block.id}`, block.originalContent)
    if (block.modernContent) check(`euclid-historical-modern:${block.id}`, block.modernContent)
  })
  const enrichment = getEuclidEnrichment(a.id)
  if (enrichment) {
    enrichment.alternativeProofs.forEach((proof) => check(`euclid-alternative:${proof.id}`, proof.content))
    enrichment.commonErrors.forEach((error) => check(`euclid-common-error:${error.id}`, error.explanation))
    check(`euclid-modern:${a.id}`, enrichment.modernExplanation.content)
  }
})
seedComments.forEach((c) => check('comment:' + c.id, c.content))
seedPapers.forEach((p) => check('paper:' + p.id, p.content + '\n' + p.description))
console.log(`\nchecked ${total} formulas, ${errors} errors`)
if (errors > 0) process.exitCode = 1
