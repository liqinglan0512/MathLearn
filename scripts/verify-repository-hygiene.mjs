import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_REPOSITORY_ROOT = resolve(SCRIPT_DIR, '..')

const FORBIDDEN_TRACKED_PATTERNS = [
  { pattern: /(^|\/)node_modules\//, reason: 'dependency directory' },
  { pattern: /(^|\/)dist(?:-ssr)?\//, reason: 'build output' },
  { pattern: /(^|\/)coverage\//, reason: 'coverage output' },
  { pattern: /(^|\/)playwright-report\//, reason: 'browser-test report' },
  { pattern: /(^|\/)test-results\//, reason: 'test output' },
  { pattern: /(^|\/)debug-shots\//, reason: 'debug capture or browser profile' },
  { pattern: /(^|\/)__pycache__\//, reason: 'Python bytecode cache' },
  { pattern: /\.py[cod]$/i, reason: 'Python bytecode' },
  { pattern: /(^|\/)\.DS_Store$/i, reason: 'operating-system metadata' },
  { pattern: /(^|\/)debug-boxed\.mjs$/i, reason: 'local debug script' },
  { pattern: /(^|\/)live-check\.css$/i, reason: 'local debug capture' },
  { pattern: /(^|\/)\.harness-active$/i, reason: 'local agent state' },
  { pattern: /(^|\/)harness-(?:progress\.txt|tasks\.json(?:\.(?:bak|tmp))?)$/i, reason: 'local agent state' },
]

const REQUIRED_IGNORE_PROBES = [
  'node_modules/example/package.json',
  'dist/assets/example.js',
  'debug-shots/profile/Default/History',
  'scripts/__pycache__/example.pyc',
  'coverage/index.html',
  'playwright-report/index.html',
  'test-results/result.json',
  '.harness-active',
  'harness-tasks.json',
]

const RETIRED_SOURCE_FILES = [
  'src/components/BlackHole.tsx',
  'src/components/WebGLBlackHole.tsx',
]

const REQUIRED_SCRIPTS = [
  'dev',
  'build',
  'lint',
  'typecheck',
  'test',
  'check:latex',
  'check',
]

export function normalizeRepositoryPath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '')
}

export function forbiddenTrackedReason(filePath) {
  const normalizedPath = normalizeRepositoryPath(filePath)
  return FORBIDDEN_TRACKED_PATTERNS.find(({ pattern }) => pattern.test(normalizedPath))?.reason ?? null
}

export function findForbiddenTrackedFiles(files) {
  return files
    .map(normalizeRepositoryPath)
    .map((file) => ({ file, reason: forbiddenTrackedReason(file) }))
    .filter(({ reason }) => reason !== null)
}

function readTrackedFiles(repositoryRoot) {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
  return output.split('\0').filter(Boolean)
}

function isIgnored(repositoryRoot, filePath) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', '--no-index', '--', filePath], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

export function auditRepository(repositoryRoot = DEFAULT_REPOSITORY_ROOT) {
  const root = resolve(repositoryRoot)
  const violations = []
  const trackedFiles = readTrackedFiles(root)

  for (const { file, reason } of findForbiddenTrackedFiles(trackedFiles)) {
    violations.push(`${file}: tracked ${reason}`)
  }

  for (const file of REQUIRED_IGNORE_PROBES) {
    if (!isIgnored(root, file)) violations.push(`${file}: expected an ignore rule`)
  }

  for (const file of RETIRED_SOURCE_FILES) {
    if (existsSync(resolve(root, file))) violations.push(`${file}: retired source still exists`)
  }

  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  if (packageJson.name !== 'mathforge') violations.push('package.json: package name must be mathforge')
  if (packageJson.private !== true) violations.push('package.json: package must remain private')
  for (const script of REQUIRED_SCRIPTS) {
    if (typeof packageJson.scripts?.[script] !== 'string' || !packageJson.scripts[script].trim()) {
      violations.push(`package.json: missing ${script} script`)
    }
  }

  const readme = readFileSync(resolve(root, 'README.md'), 'utf8')
  if (/^# React \+ TypeScript \+ Vite/m.test(readme)) {
    violations.push('README.md: default Vite template is still present')
  }

  return {
    trackedFileCount: trackedFiles.length,
    ignoreProbeCount: REQUIRED_IGNORE_PROBES.length,
    violations,
  }
}

function runCli() {
  const result = auditRepository()
  if (result.violations.length > 0) {
    console.error('Repository hygiene FAILED')
    for (const violation of result.violations) console.error(`- ${violation}`)
    process.exitCode = 1
    return
  }

  console.log(
    `Repository hygiene PASS (${result.trackedFileCount} tracked files; ${result.ignoreProbeCount} ignore probes)`,
  )
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) runCli()
