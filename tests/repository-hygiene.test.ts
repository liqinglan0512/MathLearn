import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REPOSITORY_ROOT,
  auditRepository,
  findForbiddenTrackedFiles,
  forbiddenTrackedReason,
  normalizeRepositoryPath,
} from '../scripts/verify-repository-hygiene.mjs'

describe('repository hygiene classification', () => {
  it('normalizes Windows and relative paths', () => {
    expect(normalizeRepositoryPath('.\\debug-shots\\profile\\History')).toBe(
      'debug-shots/profile/History',
    )
  })

  it.each([
    ['node_modules/react/index.js', 'dependency directory'],
    ['dist/assets/index.js', 'build output'],
    ['debug-shots/profile/Default/History', 'debug capture or browser profile'],
    ['scripts/__pycache__/builder.pyc', 'Python bytecode cache'],
    ['harness-tasks.json.tmp', 'local agent state'],
  ])('rejects %s as %s', (filePath, reason) => {
    expect(forbiddenTrackedReason(filePath)).toBe(reason)
  })

  it('does not classify source or authoritative corpus files as generated garbage', () => {
    expect(forbiddenTrackedReason('src/lib/euclid-data.json')).toBeNull()
    expect(forbiddenTrackedReason('src/pages/Home.tsx')).toBeNull()
  })

  it('returns every forbidden tracked file with a reason', () => {
    expect(
      findForbiddenTrackedFiles([
        'src/main.tsx',
        'coverage/index.html',
        'debug-boxed.mjs',
      ]),
    ).toEqual([
      { file: 'coverage/index.html', reason: 'coverage output' },
      { file: 'debug-boxed.mjs', reason: 'local debug script' },
    ])
  })
})

describe('MathForge repository baseline', () => {
  it('contains no tracked generated artifacts or retired black-hole implementation', () => {
    const result = auditRepository(DEFAULT_REPOSITORY_ROOT)
    expect(result.trackedFileCount).toBeGreaterThan(0)
    expect(result.violations).toEqual([])
  })
})
