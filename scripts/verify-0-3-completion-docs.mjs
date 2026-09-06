import assert from 'node:assert/strict'
import { access, readFile, readdir, stat } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const root = new URL('../', import.meta.url)

async function assertMissing(path) {
  await assert.rejects(access(new URL(path, root)), `${path} must be absent after repository cleanup`)
}

async function findFiles(directory, predicate, ignored = new Set()) {
  const entries = await readdir(directory, { withFileTypes: true })
  const matches = []
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
    if (entry.isDirectory()) matches.push(...await findFiles(child, predicate, ignored))
    else if (predicate(entry.name)) matches.push(child)
  }
  return matches
}

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
assert.match(report, /2d65102b408a3e9bf08f448484b47bdf79c01e08/)
assert.match(report, /14\s*份 Markdown/)
assert.match(report, /45\s*个未被.*UI 模板组件/)
assert.match(report, /16\s*个测试文件、100\s*项测试全部保留/)

await Promise.all([
  assertMissing('template-info.md'),
  assertMissing('src/App.css'),
  assertMissing('src/hooks/use-mobile.ts'),
  assertMissing('src/components/ui/chart.tsx'),
])

const markdownFiles = await findFiles(root, (name) => name.endsWith('.md'), new Set(['.git', 'dist', 'node_modules']))

// The 0.3 cleanup round pinned this at 14 to stop stray Markdown creeping back
// in. The 0.3.0 public release round adds exactly three required release
// documents, so the budget is now 17. A bare count cannot tell a deliberate
// release document from clutter, so the three additions are asserted by name.
const RELEASE_DOCUMENTS = ['RELEASE_READINESS_REPORT.md', 'POST_RELEASE_BACKLOG.md', 'DEPLOYMENT.md']
const markdownNames = markdownFiles.map((file) => decodeURIComponent(file.pathname).split('/').pop())

for (const document of RELEASE_DOCUMENTS) {
  assert.ok(markdownNames.includes(document), `release document ${document} must exist`)
}

assert.equal(
  markdownFiles.length,
  17,
  'repository must retain exactly the 14 cleanup-era Markdown documents plus the 3 release documents',
)

const uiFiles = await findFiles(new URL('src/components/ui/', root), (name) => name.endsWith('.tsx'))
assert.equal(uiFiles.length, 8, 'only the eight referenced UI wrappers should remain')

const testFiles = await findFiles(new URL('tests/', root), (name) => name.endsWith('.test.ts'))
assert.equal(testFiles.length, 16, 'all 16 regression test files must remain')

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

// Report what was actually measured. A hard-coded summary line can keep
// printing reassuring numbers long after the repository has moved on, which is
// worse than printing nothing.
console.log(
  `MATHFORGE_0_3_COMPLETION_PASS markdown=${markdownFiles.length} ui=${uiFiles.length} ` +
    `testFiles=${testFiles.length} releaseDocs=${RELEASE_DOCUMENTS.length} cleanup=verified`,
)
