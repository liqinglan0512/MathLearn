// 用 KaTeX 校验正文、分层导读、提示、讨论与欧几里得证明块中的全部公式。
import katex from 'katex'
import { buildSync } from 'esbuild'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CODE_SEGMENT_RE = /(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1[ \t]*|`[^`\n]*`/g
const BARE_TEX_COMMAND_RE = /\\(?:varepsilon|epsilon|alpha|beta|gamma|delta|theta|lambda|sigma|omega|Delta|Gamma|Lambda|Omega|frac|dfrac|tfrac|sqrt|sum|prod|int|oint|lim|infty|forall|exists|partial|nabla|operatorname|mathbb|mathbf|mathrm|text|left|right|begin|end|leq?|geq?|neq|equiv|approx|to|mapsto|cdot|times|pm|mp|in|notin|subseteq|supseteq)(?:\b|(?=[^A-Za-z]))/g

function blankPreservingLines(value) {
  return value.replace(/[^\r\n]/g, ' ')
}

function maskCodeSegments(text) {
  return text.replace(CODE_SEGMENT_RE, blankPreservingLines)
}

function isEscaped(text, index) {
  let slashes = 0
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) slashes += 1
  return slashes % 2 === 1
}

// A lone "$100" is usually currency, not an attempted Markdown math opener.
// Keep the exception narrow: expressions such as "$2x" and "$100$" still
// enter the delimiter audit.
function isCurrencyDollar(text, index) {
  const number = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?'
  const amount = new RegExp(`^${number}(?:[-–—]${number})?`).exec(text.slice(index + 1))
  if (!amount) return false
  const tail = text.slice(index + 1 + amount[0].length)
  if (!/^(?:\s|[，。！？、,.!?;:)]|$)/.test(tail)) return false
  if (/^[,，]\s*(?:\d|\\)/.test(tail)) return false
  if (/^\s*[<>=+*/^_\\$-]/.test(tail)) return false
  return true
}

function sourceLocation(text, index) {
  const before = text.slice(0, index)
  const line = before.split('\n').length
  const lastNewline = before.lastIndexOf('\n')
  return { line, column: index - lastNewline }
}

function issue(text, index, kind, message) {
  const { line, column } = sourceLocation(text, index)
  const excerpt = text.slice(Math.max(0, index - 24), Math.min(text.length, index + 56)).replace(/\s+/g, ' ').trim()
  return { kind, message, index, line, column, excerpt }
}

function maskRanges(text, ranges) {
  if (ranges.length === 0) return text
  let cursor = 0
  let result = ''
  for (const { start, end } of ranges) {
    result += text.slice(cursor, start)
    result += blankPreservingLines(text.slice(start, end))
    cursor = end
  }
  return result + text.slice(cursor)
}

/**
 * Inspect authored Markdown without rendering it.
 *
 * Code spans/fences are ignored. Closed math spans are returned for KaTeX;
 * malformed delimiters and common TeX commands left in prose are reported.
 * This catches the visible "\\varepsilon" regression that a parser-only
 * check misses when the author forgot the surrounding math delimiters.
 */
export function inspectMathMarkup(text) {
  const maskedCode = maskCodeSegments(text)
  const issues = []
  const spans = []
  let active = null
  let index = 0

  while (index < maskedCode.length) {
    if (active) {
      if (active.delimiter === '$' && (maskedCode[index] === '\n' || maskedCode[index] === '\r')) {
        issues.push(issue(text, active.start, 'unclosed_delimiter', '行内 $ 数学分隔符未在同一行闭合'))
        active = null
        index += 1
        continue
      }

      if (!isEscaped(maskedCode, index) && maskedCode.startsWith(active.close, index)) {
        spans.push({
          start: active.start,
          end: index + active.close.length,
          tex: text.slice(active.contentStart, index).trim(),
          displayMode: active.displayMode,
          delimiter: active.delimiter,
        })
        index += active.close.length
        active = null
        continue
      }

      if (!isEscaped(maskedCode, index)) {
        const wrongCloser = ['\\)', '\\]'].find((token) => token !== active.close && maskedCode.startsWith(token, index))
        if (wrongCloser) {
          issues.push(issue(text, index, 'mismatched_delimiter', `数学分隔符 ${wrongCloser} 与 ${active.delimiter} 不匹配`))
          index += wrongCloser.length
          continue
        }
      }

      index += 1
      continue
    }

    if (isEscaped(maskedCode, index)) {
      index += 1
      continue
    }

    if (maskedCode.startsWith('\\)', index) || maskedCode.startsWith('\\]', index)) {
      const closer = maskedCode.slice(index, index + 2)
      issues.push(issue(text, index, 'unexpected_closer', `出现没有对应起始符的数学分隔符 ${closer}`))
      index += 2
      continue
    }

    let opener = null
    if (maskedCode.startsWith('$$', index)) {
      opener = { delimiter: '$$', close: '$$', displayMode: true, length: 2 }
    } else if (maskedCode.startsWith('\\[', index)) {
      opener = { delimiter: '\\[', close: '\\]', displayMode: true, length: 2 }
    } else if (maskedCode.startsWith('\\(', index)) {
      opener = { delimiter: '\\(', close: '\\)', displayMode: false, length: 2 }
    } else if (maskedCode[index] === '$' && !isCurrencyDollar(maskedCode, index)) {
      opener = { delimiter: '$', close: '$', displayMode: false, length: 1 }
    }

    if (opener) {
      active = {
        ...opener,
        start: index,
        contentStart: index + opener.length,
      }
      index += opener.length
      continue
    }

    index += 1
  }

  if (active) {
    issues.push(issue(text, active.start, 'unclosed_delimiter', `数学分隔符 ${active.delimiter} 未闭合`))
  }

  const prose = maskRanges(maskedCode, spans)
  BARE_TEX_COMMAND_RE.lastIndex = 0
  let match
  while ((match = BARE_TEX_COMMAND_RE.exec(prose))) {
    if (isEscaped(prose, match.index)) continue
    issues.push(issue(text, match.index, 'bare_tex', `TeX 命令 ${match[0]} 位于数学分隔符之外`))
  }

  return { issues, spans }
}

export async function runLatexAudit() {
  // 打包本地 TypeScript/JSON 依赖，保证新增典籍语料也参与相同的公式核验。
  const output = buildSync({
    stdin: {
      contents: [
        "export * from './src/lib/seed.ts'",
        "export { getArticleLearningProfile, getProblemLearningProfile } from './src/lib/learning.ts'",
        "export { getEuclidEnrichment } from './src/lib/euclid-enrichment.ts'",
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
    getEuclidEnrichment,
  } = bundledModule.exports

  let errors = 0
  let total = 0
  function check(tag, text) {
    const audit = inspectMathMarkup(text)
    for (const markupIssue of audit.issues) {
      errors += 1
      console.log(
        `[FAIL] ${tag}:${markupIssue.line}:${markupIssue.column} ${markupIssue.message}`
        + (markupIssue.excerpt ? `\n       ${markupIssue.excerpt}` : ''),
      )
    }

    for (const span of audit.spans) {
      total += 1
      try {
        katex.renderToString(span.tex, { displayMode: span.displayMode, throwOnError: true })
      } catch (error) {
        errors += 1
        console.log(`[FAIL] ${tag}: ${span.tex.slice(0, 80)}\n       ${error.message}`)
      }
    }
  }

  seedProblems.forEach((problem) => {
    check('problem:' + problem.id, problem.statement)
    const profile = getProblemLearningProfile(problem)
    check('problem-profile:' + problem.id, profile.summary)
    profile.hints.forEach((hint, hintIndex) => check(`problem-hint:${problem.id}:${hintIndex}`, `${hint.title}\n${hint.content}`))
  })
  seedSolutions.forEach((solution) => check('solution:' + solution.id, solution.content))
  seedArticles.forEach((article) => {
    check('article:' + article.id, article.content + '\n' + article.summary)

    const profile = getArticleLearningProfile(article)
    check(
      'article-profile:' + article.id,
      [
        profile.framingQuestion,
        ...Object.values(profile.abstraction),
        ...profile.conditionChecks,
        profile.counterexample ?? '',
      ].join('\n'),
    )
  })
  seedComments.forEach((comment) => check('comment:' + comment.id, comment.content))
  seedPapers.forEach((paper) => check('paper:' + paper.id, paper.content + '\n' + paper.description))

  // Runtime Euclid pages read their content from the generated lazy JSON files,
  // so validate those exact deployment artifacts instead of the retired bundled
  // corpus module. Walking every string also covers titles, source notices,
  // historical translations and future surface roles without a fragile field list.
  function checkJsonStrings(tag, value, path = []) {
    if (typeof value === 'string') {
      check(`${tag}:${path.join('.') || 'root'}`, value)
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item, itemIndex) => checkJsonStrings(tag, item, [...path, String(itemIndex)]))
      return
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => checkJsonStrings(tag, item, [...path, key]))
    }
  }

  const euclidEntriesDirectory = new URL('./public/content/euclid/entries/', import.meta.url)
  const euclidEntryFiles = (await readdir(euclidEntriesDirectory))
    .filter((name) => name.endsWith('.json'))
    .sort()
  for (const file of euclidEntryFiles) {
    const payload = JSON.parse(await readFile(new URL(file, euclidEntriesDirectory), 'utf8'))
    checkJsonStrings(`euclid-entry:${file}`, payload)
  }

  for (const id of ['euclid-1-47']) {
    const enrichment = getEuclidEnrichment(id)
    if (!enrichment) continue
    check(`euclid-modern:${id}`, enrichment.modernExplanation.content)
    enrichment.alternativeProofs.forEach((proof) => check(`euclid-alternative:${proof.id}`, proof.content))
    enrichment.commonErrors.forEach((commonError) => check(`euclid-common-error:${commonError.id}`, commonError.content))
  }

  console.log(`\nchecked ${total} formulas, ${errors} errors`)
  if (errors > 0) process.exitCode = 1
  return { total, errors }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) await runLatexAudit()
