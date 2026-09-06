import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import { AuthProvider } from '@/lib/auth'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import { FeatureRoute } from '@/components/auth/FeatureRoute'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { FEATURES } from '@/config/features'

const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Problems = lazy(() => import('@/pages/Problems'))
const NewProblem = lazy(() => import('@/pages/NewProblem'))
const ProblemDetail = lazy(() => import('@/pages/ProblemDetail'))
const NewSolution = lazy(() => import('@/pages/NewSolution'))
const Principles = lazy(() => import('@/pages/Principles'))
const Papers = lazy(() => import('@/pages/Papers'))
const PaperDetail = lazy(() => import('@/pages/PaperDetail'))
const NewPaper = lazy(() => import('@/pages/NewPaper'))
const PrincipleDetailRoute = lazy(() => import('@/pages/PrincipleDetailRoute'))
const NewArticle = lazy(() => import('@/pages/NewArticle'))
const Viz = lazy(() => import('@/pages/Viz'))
const Tools = lazy(() => import('@/pages/Tools'))
const EuclidEditor = lazy(() => import('@/pages/admin/EuclidEditor'))
const EuclidArchive = lazy(() => import('@/pages/admin/EuclidArchive'))

function RouteLoading() {
  return (
    <div className="py-24 text-center text-sm text-[#929187]" role="status">
      正在加载当前页面…
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<FeatureRoute enabled={FEATURES.localIdentityPrototype} title="本地身份原型未启用" description="MathForge 公开版本没有账户系统。学习标记只保存在当前浏览器，不需要也不会创建任何账号；请不要在此站点输入真实密码。"><Login /></FeatureRoute>} />
            <Route path="/register" element={<FeatureRoute enabled={FEATURES.localIdentityPrototype} title="本地身份原型未启用" description="MathForge 公开版本没有账户系统。学习标记只保存在当前浏览器，不需要也不会创建任何账号；请不要在此站点输入真实密码。"><Register /></FeatureRoute>} />
            <Route path="/problems" element={<Problems />} />
            <Route path="/problems/new" element={<FeatureRoute enabled={FEATURES.publicContribution}><NewProblem /></FeatureRoute>} />
            <Route path="/problems/:id" element={<ProblemDetail />} />
            <Route path="/problems/:id/new-solution" element={<FeatureRoute enabled={FEATURES.publicContribution}><NewSolution /></FeatureRoute>} />
            <Route path="/papers" element={<Papers />} />
            <Route path="/papers/new" element={<FeatureRoute enabled={FEATURES.publicContribution}><NewPaper /></FeatureRoute>} />
            <Route path="/papers/:id" element={<PaperDetail />} />
            <Route path="/principles" element={<Principles />} />
            <Route path="/principles/new" element={<FeatureRoute enabled={FEATURES.publicContribution}><NewArticle /></FeatureRoute>} />
            <Route path="/principles/:id" element={<PrincipleDetailRoute />} />
            <Route path="/internal/euclid" element={<AdminRoute><EuclidArchive /></AdminRoute>} />
            <Route path="/internal/euclid/:id/edit" element={<AdminRoute><EuclidEditor /></AdminRoute>} />
            <Route path="/viz" element={<Viz />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
