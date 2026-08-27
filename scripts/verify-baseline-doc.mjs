import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const path = new URL('../docs/MATHFORGE_0_2_BASELINE_AUDIT.md', import.meta.url)
const document = await readFile(path, 'utf8')

const requiredSections = [
  '当前技术栈',
  '当前路由',
  '当前数据模型',
  'localStorage 与 sessionStorage key',
  '当前用户权限',
  '当前上传入口',
  '当前《几何原本》数据加载方式',
  '当前代码质量问题',
  '当前构建情况',
  '当前测试情况',
  '本轮预计修改文件',
]

for (const section of requiredSections) {
  assert.match(document, new RegExp(`^## \\d+\\. ${section.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'm'))
}

assert.match(document, /48b483dd5390f343dfb784fcd3edab58dbf33f5b/)
assert.match(document, /12 errors、0 warnings/)
assert.match(document, /4,918,344 B/)
assert.match(document, /普通登录用户可从 UI、Router、Data layer 三层直接创建并公开内容/)
assert.match(document, /不得把机器翻译或自动检查结果升级为数学审核结论/)

console.log(`BASELINE_DOC_PASS sections=${requiredSections.length} bytes=${Buffer.byteLength(document)}`)
