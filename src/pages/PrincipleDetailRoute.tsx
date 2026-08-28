import { lazy } from 'react'
import { useParams } from 'react-router'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { FEATURES } from '@/config/features'

const ArticleDetail = lazy(() => import('@/pages/ArticleDetail'))
const EuclidArticleDetail = lazy(() => import('@/pages/EuclidArticleDetail'))

const EUCLID_ENTRY_ID = /^euclid-(?:[1-9]|1[0-3])-(?:(?:def|post|cn)-)?[1-9]\d*$/

export default function PrincipleDetailRoute() {
  const { id = '' } = useParams()
  if (!EUCLID_ENTRY_ID.test(id)) return <ArticleDetail />
  if (FEATURES.euclidPublic) return <EuclidArticleDetail />
  return <AdminRoute><EuclidArticleDetail /></AdminRoute>
}
