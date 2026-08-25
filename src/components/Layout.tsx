import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useState } from 'react'
import { Menu, X, Sigma, User as UserIcon, LogOut, PenLine } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
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
    <div className="min-h-screen text-neutral-200 antialiased">
      <div className="cosmos-bg" />
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-neutral-100">
            <Sigma className="h-5 w-5 text-indigo-300" strokeWidth={2.5} />
            MathForge
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm ${
                    isActive ? 'bg-white/10 font-medium text-white' : 'text-neutral-400 hover:text-neutral-100'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-neutral-300 hover:text-white">
                    <UserIcon className="h-4 w-4" />
                    <span className="max-w-24 truncate">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => nav('/problems?new=1')}>
                    <PenLine className="mr-2 h-4 w-4" /> 上传题目
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav('/papers/new')}>
                    <PenLine className="mr-2 h-4 w-4" /> 上传试卷
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => nav('/principles/new')}>
                    <PenLine className="mr-2 h-4 w-4" /> 写推导长文
                  </DropdownMenuItem>
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
                <Button variant="ghost" size="sm" className="text-neutral-300" onClick={() => nav('/login')}>
                  登录
                </Button>
                <Button size="sm" onClick={() => nav('/register')}>
                  注册
                </Button>
              </>
            )}
            <button className="text-neutral-300 md:hidden" onClick={() => setOpen(!open)} aria-label="菜单">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-white/[0.06] px-4 py-2 md:hidden">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-neutral-400 hover:bg-white/5 hover:text-neutral-100"
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <Outlet />
      </main>
      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-neutral-600">
        MathForge · 极简深度数学学习平台 · Less is more
      </footer>
    </div>
  )
}
