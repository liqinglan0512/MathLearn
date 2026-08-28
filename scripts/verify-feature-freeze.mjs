import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const [features, app, layout, problems, papers, principles, problemDetail, store, attachments, learning] = await Promise.all([
  read('src/config/features.ts'),
  read('src/App.tsx'),
  read('src/components/Layout.tsx'),
  read('src/pages/Problems.tsx'),
  read('src/pages/Papers.tsx'),
  read('src/pages/Principles.tsx'),
  read('src/pages/ProblemDetail.tsx'),
  read('src/lib/store.ts'),
  read('src/components/Attachments.tsx'),
  read('src/lib/learning.ts'),
])

assert.match(features, /publicContribution:\s*false/)
assert.match(features, /attachmentUpload:\s*false/)
assert.match(features, /euclidPublic:\s*false/)
assert.match(features, /challenge:\s*false/)
assert.match(features, /learningJournal:\s*false/)
assert.match(features, /aiAssistant:\s*false/)
assert.match(features, /social:\s*false/)
assert.match(features, /localIdentityPrototype:\s*Boolean\(import\.meta\.env\??\.DEV\)/)
assert.match(features, /localDiscussionPrototype:\s*Boolean\(import\.meta\.env\??\.DEV\)/)

for (const route of [
  '/problems/new',
  '/problems/:id/new-solution',
  '/papers/new',
  '/principles/new',
]) {
  const routeFragment = app.slice(app.indexOf(`path="${route}"`), app.indexOf(`path="${route}"`) + 220)
  assert.match(routeFragment, /FeatureRoute enabled=\{FEATURES\.publicContribution\}/)
}

for (const source of [layout, problems, papers, principles, problemDetail]) {
  assert.match(source, /FEATURES\.publicContribution/)
}

for (const method of ['addProblem', 'addSolution', 'addArticle', 'addPaper']) {
  const methodFragment = store.slice(store.indexOf(`${method}(`), store.indexOf(`${method}(`) + 320)
  assert.match(methodFragment, /assertCanSubmitPublicContent/)
}
assert.match(store, /assertAttachmentsAllowed\(actor, p\.attachments\)/)
assert.match(store, /assertAttachmentsAllowed\(actor, s\.attachments\)/)

assert.doesNotMatch(attachments, /accept="image\/\*/)
assert.match(attachments, /image\/png/)
assert.match(attachments, /image\/jpeg/)
assert.match(attachments, /image\/webp/)
assert.match(attachments, /附件上传[^\n]{0,40}关闭/)

assert.match(learning, /assertCanModerateReview\(actor\)/)
assert.match(layout, /学习标记[^\n]{0,40}当前浏览器/)

console.log('FEATURE_FREEZE_PASS ui=5 routes=4 data_methods=4 frozen=upload,euclid,ai,challenge,journal,social review_guard=admin')
