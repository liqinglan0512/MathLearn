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
import ArticleDetail from '@/pages/ArticleDetail'
import NewArticle from '@/pages/NewArticle'
import Viz from '@/pages/Viz'
import Tools from '@/pages/Tools'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/problems/new" element={<NewProblem />} />
          <Route path="/problems/:id" element={<ProblemDetail />} />
          <Route path="/problems/:id/new-solution" element={<NewSolution />} />
          <Route path="/principles" element={<Principles />} />
          <Route path="/principles/new" element={<NewArticle />} />
          <Route path="/principles/:id" element={<ArticleDetail />} />
          <Route path="/viz" element={<Viz />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
