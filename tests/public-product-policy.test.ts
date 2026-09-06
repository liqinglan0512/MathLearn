import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { FEATURES } from '../src/config/features'
import {
  GITHUB_REPOSITORY_URL,
  OPEN_LEARNING_LOOP,
  PUBLIC_NAVIGATION,
} from '../src/config/product'

const readSource = (relativePath: string) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8')

describe('MathForge 0.3 public product policy', () => {
  it('keeps every frozen public expansion disabled', () => {
    expect(Object.isFrozen(FEATURES)).toBe(true)
    expect({
      euclidPublic: FEATURES.euclidPublic,
      publicContribution: FEATURES.publicContribution,
      attachmentUpload: FEATURES.attachmentUpload,
      challenge: FEATURES.challenge,
      learningJournal: FEATURES.learningJournal,
      aiAssistant: FEATURES.aiAssistant,
      social: FEATURES.social,
    }).toEqual({
      euclidPublic: false,
      publicContribution: false,
      attachmentUpload: false,
      challenge: false,
      learningJournal: false,
      aiAssistant: false,
      social: false,
    })
  })

  it('exposes the Open Learning Core navigation in the agreed order', () => {
    expect(PUBLIC_NAVIGATION.map(({ label }) => label)).toEqual([
      '理解数学',
      '可视化',
      '练习',
      '工具',
      'GitHub',
    ])
    expect(PUBLIC_NAVIGATION.map(({ to }) => to)).toEqual([
      '/principles',
      '/viz',
      '/problems',
      '/tools',
      'https://github.com/liqinglan0512/MathLearn',
    ])
    expect(GITHUB_REPOSITORY_URL).toBe('https://github.com/liqinglan0512/MathLearn')
    expect(PUBLIC_NAVIGATION.at(-1)).toEqual({
      kind: 'external',
      to: GITHUB_REPOSITORY_URL,
      label: 'GitHub',
    })
  })

  it('does not promote accounts, Euclid, or legacy community surfaces in the main navigation', () => {
    const publicNavigation = JSON.stringify(PUBLIC_NAVIGATION)
    expect(publicNavigation).not.toMatch(/login|register|登录|注册/i)
    expect(publicNavigation).not.toMatch(/euclid|几何原本/i)
    expect(publicNavigation).not.toMatch(/题库|试卷/)
  })

  it('defines the learner journey as understand, visualize, practice, contribute', () => {
    expect(OPEN_LEARNING_LOOP.map(({ id }) => id)).toEqual([
      'understand',
      'visualize',
      'practice',
      'contribute',
    ])
    expect(OPEN_LEARNING_LOOP.map(({ label }) => label)).toEqual(['理解', '可视化', '练习', '开源'])
  })

  it('keeps Euclid off the home page and makes learning, not the problem archive, the primary CTA', async () => {
    const home = await readSource('src/pages/Home.tsx')
    expect(home).not.toMatch(/euclid|几何原本/i)

    const primaryCtaStart = home.indexOf('home-primary-cta')
    expect(primaryCtaStart).toBeGreaterThan(-1)
    const primaryCta = home.slice(primaryCtaStart, primaryCtaStart + 500)
    expect(primaryCta).toMatch(/<Link\s+to="\/principles">/)
    expect(primaryCta).not.toMatch(/<Link\s+to="\/problems">/)
  })

  it('keeps direct local identity prototypes recoverable but explicitly labelled', async () => {
    const [app, login, register] = await Promise.all([
      readSource('src/App.tsx'),
      readSource('src/pages/Login.tsx'),
      readSource('src/pages/Register.tsx'),
    ])
    expect(app).toMatch(/path="\/login"/)
    expect(app).toMatch(/path="\/register"/)
    expect(login).toMatch(/LOCAL IDENTITY PROTOTYPE/)
    expect(register).toMatch(/LOCAL IDENTITY PROTOTYPE/)
    expect(`${login}\n${register}`).toMatch(/真实密码/)
  })
})

describe('local identity prototype containment', () => {
  it('keeps the identity prototype out of production builds', () => {
    // import.meta.env.DEV is false in a production build, so the public site
    // must ship without any account system at all.
    expect(FEATURES.localIdentityPrototype).toBe(Boolean(import.meta.env?.DEV))
  })

  it('gates /login and /register behind the identity prototype flag', async () => {
    const app = await readSource('src/App.tsx')

    for (const path of ['/login', '/register']) {
      const route = new RegExp(`<Route path="${path}"[^\n]*`).exec(app)?.[0] ?? ''
      expect(route, `${path} route missing`).not.toBe('')
      expect(route, `${path} must be gated by FEATURES.localIdentityPrototype`).toContain(
        'enabled={FEATURES.localIdentityPrototype}',
      )
    }
  })

  it('never routes to /login from a surface that is public in production', async () => {
    // Any component that navigates to /login must itself be behind a flag that
    // is disabled in production, otherwise visitors reach a password form that
    // writes credentials to localStorage.
    const publicSurfaces = ['src/components/Layout.tsx', 'src/pages/Papers.tsx', 'src/pages/Problems.tsx']

    for (const relativePath of publicSurfaces) {
      const source = await readSource(relativePath)
      const loginLines = source
        .split('\n')
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(({ line }) => line.includes("'/login'") || line.includes('to="/login"'))

      for (const { number } of loginLines) {
        const preceding = source.split('\n').slice(Math.max(0, number - 8), number).join('\n')
        expect(
          /FEATURES\.(localIdentityPrototype|publicContribution|localDiscussionPrototype)/.test(preceding),
          `${relativePath}:${number} navigates to /login without a production-disabled flag guard`,
        ).toBe(true)
      }
    }
  })
})
