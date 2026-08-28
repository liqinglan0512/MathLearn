import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const [
  features,
  product,
  app,
  layout,
  home,
  principles,
  principleDetailRoute,
  euclidArticleDetail,
  euclidCatalogBrowser,
  euclidArchive,
] = await Promise.all([
  read('src/config/features.ts'),
  read('src/config/product.ts'),
  read('src/App.tsx'),
  read('src/components/Layout.tsx'),
  read('src/pages/Home.tsx'),
  read('src/pages/Principles.tsx'),
  read('src/pages/PrincipleDetailRoute.tsx'),
  read('src/pages/EuclidArticleDetail.tsx'),
  read('src/components/euclid/EuclidCatalogBrowser.tsx'),
  read('src/pages/admin/EuclidArchive.tsx'),
])

const GITHUB_URL = 'https://github.com/liqinglan0512/MathLearn'

assert.match(features, /euclidPublic:\s*false/)
for (const flag of ['publicContribution', 'attachmentUpload', 'challenge', 'learningJournal', 'aiAssistant', 'social']) {
  assert.match(features, new RegExp(`${flag}:\\s*false`), `${flag} must remain false in the public product`)
}

assert.match(product, new RegExp(`GITHUB_REPOSITORY_URL\\s*=\\s*['"]${GITHUB_URL.replaceAll('/', '\\/')}['"]`))
const navigationStart = product.indexOf('export const PUBLIC_NAVIGATION')
const navigationEnd = product.indexOf('] as const', navigationStart)
assert(navigationStart >= 0 && navigationEnd > navigationStart, 'PUBLIC_NAVIGATION must be an explicit stable export')
const navigation = product.slice(navigationStart, navigationEnd)

const expectedNavigation = [
  ['理解数学', '/principles'],
  ['可视化', '/viz'],
  ['练习', '/problems'],
  ['工具', '/tools'],
  ['GitHub', 'GITHUB_REPOSITORY_URL'],
]
let previousPosition = -1
for (const [label, destination] of expectedNavigation) {
  const position = navigation.indexOf(`label: '${label}'`)
  assert(position > previousPosition, `${label} is missing or out of order in PUBLIC_NAVIGATION`)
  const itemStart = navigation.lastIndexOf('{', position)
  const itemEnd = navigation.indexOf('}', position)
  const item = navigation.slice(itemStart, itemEnd + 1)
  assert(item.includes(destination), `${label} has the wrong destination`)
  previousPosition = position
}
assert.doesNotMatch(navigation, /login|register|登录|注册|euclid|几何原本|题库|试卷/i)
assert.match(layout, /PUBLIC_NAVIGATION\.map/)
const publicNavMaps = layout.match(/PUBLIC_NAVIGATION\.map/g) ?? []
assert.equal(publicNavMaps.length, 2, 'Desktop and mobile navigation must each render the canonical public navigation once')
const publicNavBlocks = layout.match(/<nav\b[\s\S]*?<\/nav>/g) ?? []
assert.equal(publicNavBlocks.length, 2, 'Layout must expose exactly one desktop and one mobile public navigation')
for (const block of publicNavBlocks) {
  assert.equal((block.match(/PUBLIC_NAVIGATION\.map/g) ?? []).length, 1, 'Each public navigation must use the canonical list once')
  assert.equal((block.match(/<(?:NavLink|a)\b/g) ?? []).length, 2, 'Public navigation must not hard-code extra items')
}

assert.doesNotMatch(home, /euclid|几何原本/i)
const primaryCtaStart = home.indexOf('home-primary-cta')
assert(primaryCtaStart >= 0, 'Home primary CTA marker is missing')
const primaryCta = home.slice(primaryCtaStart, primaryCtaStart + 500)
assert.match(primaryCta, /<Link\s+to="\/principles">/)
assert.doesNotMatch(primaryCta, /<Link\s+to="\/problems">/)
assert.match(home, /GITHUB_REPOSITORY_URL/)

// Public Principles must only mount the archive browser behind the single
// product switch. Loading remains inside the shared component so a false flag
// cannot fetch the Euclid catalog as a side effect of visiting the directory.
assert.match(principles, /EuclidCatalogBrowser/)
assert.equal((principles.match(/<EuclidCatalogBrowser\b/g) ?? []).length, 1, 'Public Principles must have exactly one Euclid browser mount')
assert.doesNotMatch(principles, /euclidRepository\.(?:loadCatalog|loadBookIndex)/)
const publicFlagPosition = principles.indexOf('FEATURES.euclidPublic')
const browserMountPosition = principles.indexOf('<EuclidCatalogBrowser', publicFlagPosition)
assert(publicFlagPosition >= 0 && browserMountPosition > publicFlagPosition, 'Public Euclid browser is not controlled by euclidPublic')
const mountGuard = principles.slice(publicFlagPosition, browserMountPosition)
assert.match(mountGuard, /&&|\?/, 'EuclidCatalogBrowser must be conditionally mounted, not merely styled as hidden')

assert.match(principleDetailRoute, /if\s*\(\s*FEATURES\.euclidPublic\s*\)[\s\S]{0,80}return\s*<EuclidArticleDetail\s*\/>/)
assert.match(principleDetailRoute, /<AdminRoute\s*>\s*<EuclidArticleDetail\s*\/>\s*<\/AdminRoute>/)
assert.match(euclidArticleDetail, /localDiscussionEnabled\s*=\s*FEATURES\.localDiscussionPrototype/)
assert.match(euclidArticleDetail, /localDiscussionEnabled\s*\?\s*\(\s*<PassageAnnotations/)
assert.match(euclidArticleDetail, /localDiscussionEnabled\s*&&\s*\(\s*<section[\s\S]*?<CommentThread/)

for (const route of ['/internal/euclid', '/internal/euclid/:id/edit']) {
  const start = app.indexOf(`path="${route}"`)
  assert(start >= 0, `${route} is missing`)
  assert.match(app.slice(start, start + 220), /<AdminRoute>/, `${route} must remain internal`)
}
assert.match(euclidArchive, /<EuclidCatalogBrowser\s+internal\s*\/>/)
assert.match(euclidCatalogBrowser, /euclidRepository\.loadCatalog/)
assert.match(euclidCatalogBrowser, /euclidRepository\.loadBookIndex/)

const contentRoot = new URL('../public/content/euclid/', import.meta.url)
const [entryNames, bookNames, catalogInfo, sourceInfo, modernInfo] = await Promise.all([
  readdir(new URL('entries/', contentRoot)),
  readdir(new URL('books/', contentRoot)),
  stat(new URL('catalog.json', contentRoot)),
  stat(new URL('../src/lib/euclid-data.json', import.meta.url)),
  stat(new URL('../src/lib/euclid-modern-zh.json', import.meta.url)),
])
const entries = entryNames.filter((name) => name.endsWith('.json'))
const books = bookNames.filter((name) => name.endsWith('.index.json'))
assert.equal(entries.length, 607, 'Euclid archive must retain 607 entry payloads')
assert.equal(books.length, 13, 'Euclid archive must retain 13 book indexes')
assert.equal(1 + entries.length + books.length, 621, 'Euclid generated archive must retain 621 JSON files')
assert(catalogInfo.isFile() && sourceInfo.isFile() && modernInfo.isFile(), 'Euclid catalog and canonical corpora must remain files')

console.log('PRODUCT_DIRECTION_PASS nav=5 github=exact euclidPublic=false archive=621 internal_routes=2 home=learning_first')
