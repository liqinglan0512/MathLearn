import { readFile, stat } from 'node:fs/promises'

const REQUIRED_DOCUMENTS = [
  'MATHFORGE_0_2_BASELINE_AUDIT.md',
  'MATHFORGE_0_2_ARCHITECTURE.md',
  'CONTENT_MODEL.md',
  'EDITORIAL_WORKFLOW.md',
  'PERMISSION_MODEL.md',
  'PERFORMANCE_BASELINE_0_2.md',
  'TEST_REPORT.md',
  'MATHFORGE_0_2_COMPLETION_REPORT.md',
]

const docsUrl = new URL('../docs/', import.meta.url)
const reportUrl = new URL('MATHFORGE_0_2_COMPLETION_REPORT.md', docsUrl)
const failures = []

for (const name of REQUIRED_DOCUMENTS) {
  const url = new URL(name, docsUrl)
  try {
    const info = await stat(url)
    if (!info.isFile() || info.size < 100) failures.push(`${name}: missing or unexpectedly empty`)
  } catch {
    failures.push(`${name}: missing`)
  }
}

let report = ''
try {
  report = await readFile(reportUrl, 'utf8')
} catch {
  failures.push('Completion report cannot be read')
}

function requireAll(label, patterns) {
  const missing = patterns.filter((pattern) => !pattern.test(report))
  if (missing.length > 0) failures.push(`${label}: missing ${missing.length} required concept(s)`)
}

function requireAny(label, patterns) {
  if (!patterns.some((pattern) => pattern.test(report))) failures.push(`${label}: boundary is not stated`)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function validateReleaseStatusBlock(document) {
  const blockMatch = document.match(/<!--\s*RELEASE_STATUS_START\s*-->([\s\S]*?)<!--\s*RELEASE_STATUS_END\s*-->/)
  if (!blockMatch) return ['release status markers are missing or out of order']

  const block = blockMatch[1]
  const definitions = [
    {
      label: 'GitHub 推送',
      evidence: [
        ['commit SHA', /(?:commit(?:\s+SHA)?|提交(?:哈希|SHA)?)[：:\s`*]*[0-9a-f]{7,40}\b/i],
        ['GitHub Actions run URL', /https:\/\/github\.com\/[^\s)]+\/actions\/runs\/\d+/i],
        ['successful CI result', /(?:CI|GitHub Actions)[^\n。；;]{0,80}(?:PASS|通过|成功)|(?:PASS|通过|成功)[^\n。；;]{0,80}(?:CI|GitHub Actions)/i],
      ],
    },
    {
      label: '云服务器部署',
      evidence: [
        ['deployment timestamp', /部署时间[：:\s`*]*\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?/i],
        ['public URL', /https?:\/\/[^\s)]+/i],
        ['release directory or artifact', /(?:发布目录|构建产物|artifact)[：:\s`*]+\S+/i],
        ['rollback point', /(?:回滚点|rollback)[：:\s`*]+\S+/i],
        ['successful health check', /(?:健康检查|health check)[^\n。；;]{0,80}(?:PASS|通过|成功|2\d\d)/i],
      ],
    },
    {
      label: '线上 QA',
      evidence: [
        ['QA timestamp', /(?:QA|验收|测试)\s*时间[：:\s`*]*\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?/i],
        ['tested public URL', /https?:\/\/[^\s)]+/i],
        ['successful QA checklist', /(?:QA\s*(?:清单|结果)|验收清单|烟雾测试)[^\n。；;]{0,100}(?:PASS|通过|成功|完成)/i],
      ],
    },
  ]

  const findings = []
  const positions = definitions.map(({ label }) => ({ label, index: block.indexOf(label) }))
  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index]
    const start = positions[index].index
    if (start < 0) {
      findings.push(`${definition.label}: status line is missing`)
      continue
    }
    const laterPositions = positions.slice(index + 1).map((item) => item.index).filter((position) => position > start)
    const end = laterPositions.length > 0 ? Math.min(...laterPositions) : block.length
    const segment = block.slice(start, end)
    const status = segment.match(new RegExp(`${escapeRegExp(definition.label)}[：:]\\s*(未完成|已完成)`))?.[1]
    if (!status) {
      findings.push(`${definition.label}: status must be 未完成 or 已完成`)
      continue
    }
    if (status === '未完成') continue

    for (const [evidenceLabel, pattern] of definition.evidence) {
      if (!pattern.test(segment)) findings.push(`${definition.label}: completed status lacks ${evidenceLabel}`)
    }
  }
  return findings
}

if (report) {
  requireAll('four-state vocabulary', [
    /已完成/,
    /部分完成/,
    /未完成/,
    /需Leo人工操作/i,
  ])
  requireAny('607 entries remain raw machine content', [
    /607[^\n]{0,100}`?raw_machine`?/i,
    /`?raw_machine`?[^\n]{0,100}607/i,
  ])
  requireAll('Book I pilot scope and human review boundary', [
    /I\.1\s*[–—-]\s*I\.10/,
    /I\.47/,
    /(尚未|未完成)[^\n]{0,40}(人工)?数学审校|需Leo人工操作[^\n]{0,80}审校/,
  ])
  requireAny('source corpus immutability', [
    /原始语料[^\n]{0,50}(未改|未改写|保持不变)/,
    /两份源 JSON[^\n]{0,50}(未改|保留)/i,
  ])
  requireAny('machine content cannot auto-promote', [
    /机器[^\n]{0,60}(不自动升级|(不得|不能)[^\n]{0,30}自动升级)/,
    /不得[^\n]{0,50}raw_machine[^\n]{0,80}(math_reviewed|published)/i,
  ])
  requireAny('zero verified visualizations', [
    /verified\s*[=:：]\s*0/i,
    /`verified`[^\n]{0,20}0/i,
  ])
  requireAll('stable annotation anchor boundary', [
    /blockId/,
    /version/,
    /quote/,
    /prefix/,
    /suffix/,
    /(旧版本|重新定位|重新锚定)/,
  ])
  requireAll('dependency provenance boundary', [
    /explicit_source_reference/,
    /editorial_inference/,
    /(反向依赖|incoming|哪些条目使用)/i,
  ])
  requireAll('local editor and identity are not a secure backend', [
    /localStorage/i,
    /(前端身份|本地管理员|isAdmin)/i,
    /(不构成安全后端|不是安全认证|不是服务端)/,
  ])
  requireAll('public contribution remains frozen', [
    /(公开投稿|公共投稿)[^\n]{0,30}(冻结|关闭)/,
    /(附件上传|文件上传)[^\n]{0,30}(冻结|关闭|disabled)/i,
  ])
  requireAll('local pilot event boundary', [
    /(本地试验事件|匿名本地事件)/,
    /(opened_proposition|打开命题)/,
    /(部分完成|尚未完整接入|只接线)/,
  ])
  failures.push(...validateReleaseStatusBlock(report))
}

if (failures.length > 0) {
  console.error('COMPLETION_DOCS_FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`COMPLETION_DOCS_PASS documents=${REQUIRED_DOCUMENTS.length} reportBytes=${Buffer.byteLength(report)}`)
}
