import { Routes, Route, Navigate } from 'react-router'
import { AuthProvider } from '@/lib/auth'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Problems from '@/pages/Problems'
import NewProblem from '@/pages/NewProblem'
import ProblemDetail from '@/pages/ProblemDetail'
import NewSolution from '@/pages/NewSolution'
import Principles from '@/pages/Principles'
import Papers from '@/pages/Papers'
import PaperDetail from '@/pages/PaperDetail'
import NewPaper from '@/pages/NewPaper'
import ArticleDetail from '@/pages/ArticleDetail'
import NewArticle from '@/pages/NewArticle'
import Viz from '@/pages/Viz'
import Tools from '@/pages/Tools'
import { FeatureRoute } from '@/components/auth/FeatureRoute'
import { FEATURES } from '@/config/features'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/problems/new" element={<FeatureRoute enabled={FEATURES.publicContribution}><NewProblem /></FeatureRoute>} />
          <Route path="/problems/:id" element={<ProblemDetail />} />
          <Route path="/problems/:id/new-solution" element={<FeatureRoute enabled={FEATURES.publicContribution}><NewSolution /></FeatureRoute>} />
          <Route path="/papers" element={<Papers />} />
          <Route path="/papers/new" element={<FeatureRoute enabled={FEATURES.publicContribution}><NewPaper /></FeatureRoute>} />
          <Route path="/papers/:id" element={<PaperDetail />} />
          <Route path="/principles" element={<Principles />} />
          <Route path="/principles/new" element={<FeatureRoute enabled={FEATURES.publicContribution}><NewArticle /></FeatureRoute>} />
          <Route path="/principles/:id" element={<ArticleDetail />} />
          <Route path="/viz" element={<Viz />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
