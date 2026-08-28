import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const requiredDocuments = [
  'README.md',
  'CONTRIBUTING.md',
  'docs/MATHFORGE_0_3_PRODUCT_DIRECTION.md',
  'docs/DEPENDENCY_SECURITY_TRIAGE.md',
  'docs/MATHFORGE_0_3_COMPLETION_REPORT.md',
]

for (const path of requiredDocuments) {
  const info = await stat(new URL(`../${path}`, import.meta.url))
  assert(info.isFile() && info.size > 500, `${path} must be a substantive file`)
}

const [readme, contribution, direction, security, report] = await Promise.all([
  read('README.md'),
  read('CONTRIBUTING.md'),
  read('docs/MATHFORGE_0_3_PRODUCT_DIRECTION.md'),
  read('docs/DEPENDENCY_SECURITY_TRIAGE.md'),
  read('docs/MATHFORGE_0_3_COMPLETION_REPORT.md'),
])

for (const section of ['## 已完成', '## 部分完成', '## 未完成', '## 需要 Leo 决策']) {
  assert(report.includes(section), `0.3 completion report is missing ${section}`)
}

assert.match(report, /e6841ff4511e9aa48ea6f85880bdb1c2355ffab9/)
assert.match(report, /14\s*(?:个|篇).*pilot/i)
assert.match(report, /607\s*个\s*entry/i)
assert.match(report, /621\s*个.*JSON/i)
assert.match(report, /7,152\s*个\s*SemanticBlock/i)
assert.match(report, /16\s*个\s*test file\s*\/\s*100\s*项\s*test/i)
assert.match(report, /569\s*个公式\s*\/\s*0\s*error/i)
assert.match(report, /10 high、1 moderate、1 low，共 12/i)
assert.match(report, /npm audit --omit=dev.*1 high/is)
assert.match(report, /未推送 GitHub/)
assert.match(report, /CI 未运行 0\.3 commit/)
assert.match(report, /未部署 0\.3/)
assert.match(report, /没有运行 `npm audit fix`/)
assert.match(report, /许可证.*Leo|Leo.*许可证/is)

for (const route of [
  '`/`',
  '`/principles`',
  '`/principles/euclid-1-47`',
  '`/viz?lab=probability`',
  '`/problems?q=概率`',
  '`/principles/a3`',
  '`/principles/a13`',
  '`/problems/p8`',
  '`/login`',
]) {
  assert(report.includes(route), `0.3 completion report is missing browser QA for ${route}`)
}

assert.match(readme, /Open Learning Core/)
assert.match(contribution, /What[\s\S]*Why[\s\S]*How verified/)
assert.match(direction, /Understand[\s\S]*Visualize[\s\S]*Practice[\s\S]*Contribute/)
assert.match(security, /没有升级依赖/)

console.log('MATHFORGE_0_3_COMPLETION_PASS documents=5 statuses=4 tests=100 formulas=569 release=local_only')
