import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useState } from 'react'
import { Menu, X, Sigma, User as UserIcon, LogOut, PenLine } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { FEATURES } from '@/config/features'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NAV = [
  { to: '/problems', label: '题库' },
  { to: '/papers', label: '试卷' },
  { to: '/principles', label: '第一性原理' },
  { to: '/viz', label: '可视化' },
  { to: '/tools', label: '工具' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen text-[#d8d4c7] antialiased">
      <div className="mathematical-bg" aria-hidden="true" />
      <header className="site-header sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-7 px-4 sm:px-6 lg:px-9">
          <Link to="/" className="site-wordmark flex shrink-0 items-center gap-2.5 text-[15px] font-semibold tracking-[-0.035em] text-[#f0e8d3]">
            <Sigma className="h-[19px] w-[19px] text-[#c7ad70]" strokeWidth={2.1} />
            MathForge
          </Link>
          <nav className="hidden h-full items-center gap-1 md:flex" aria-label="主导航">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `site-nav-link${isActive ? ' site-nav-link-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-[#bbb7ac] hover:text-[#f0e8d3]">
                    <UserIcon className="h-4 w-4" />
                    <span className="max-w-24 truncate">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {FEATURES.publicContribution && (
                    <>
                      <DropdownMenuItem onClick={() => nav('/problems/new')}>
                        <PenLine className="mr-2 h-4 w-4" /> 提交题目审核
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => nav('/papers/new')}>
                        <PenLine className="mr-2 h-4 w-4" /> 提交试卷审核
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => nav('/principles/new')}>
                        <PenLine className="mr-2 h-4 w-4" /> 提交推导审核
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      logout()
                      nav('/')
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> 退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-[#aaa79d] hover:text-[#f0e8d3]" onClick={() => nav('/login')}>
                  登录
                </Button>
                <Button size="sm" className="rounded-[4px] px-4" onClick={() => nav('/register')}>
                  注册
                </Button>
              </>
            )}
            <button
              className="rounded p-1 text-[#bcb8ad] hover:text-[#f0e8d3] md:hidden"
              onClick={() => setOpen(!open)}
              aria-label={open ? '关闭菜单' : '打开菜单'}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="site-mobile-nav px-4 py-2 md:hidden" aria-label="移动端导航">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-[3px] px-3 py-2.5 text-[14px] ${
                    isActive ? 'text-[#e8dfc9]' : 'text-[#929188] hover:text-[#e8dfc9]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <Outlet />
      </main>
      <footer className="site-footer px-4 py-9 text-center text-[12px] tracking-[0.025em] text-[#74756e]">
        <p className="mx-auto max-w-2xl leading-6">
          当前为 MathForge 本地测试版本。账户、批注和学习数据仅保存在当前浏览器中，请勿视为长期云端存储。
        </p>
        <p className="mt-2">MathForge · 让理解先于记忆</p>
      </footer>
    </div>
  )
}
