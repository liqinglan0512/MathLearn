import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useState } from 'react'
import { ExternalLink, Menu, X, Sigma, User as UserIcon, LogOut, PenLine } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { FEATURES } from '@/config/features'
import { GITHUB_REPOSITORY_URL, PUBLIC_NAVIGATION } from '@/config/product'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
            {PUBLIC_NAVIGATION.map((item) => item.kind === 'external'
              ? (
                  <a key={item.to} href={item.to} target="_blank" rel="noreferrer"
                    className="site-nav-link inline-flex items-center gap-1.5">
                    {item.label}<ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )
              : (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `site-nav-link${isActive ? ' site-nav-link-active' : ''}`}>
                    {item.label}
                  </NavLink>
                ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {FEATURES.localIdentityPrototype && user ? (
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
            ) : FEATURES.localIdentityPrototype ? (
              <Link to="/login" className="hidden text-[10px] tracking-[0.14em] text-[#7f8078] hover:text-[#d4ccbb] sm:inline">
                LOCAL PROTOTYPE
              </Link>
            ) : null}
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
            {PUBLIC_NAVIGATION.map((item) => item.kind === 'external'
              ? (
                  <a key={item.to} href={item.to} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 rounded-[3px] px-3 py-2.5 text-[14px] text-[#929188] hover:text-[#e8dfc9]">
                    {item.label}<ExternalLink className="h-3 w-3" />
                  </a>
                )
              : (
                  <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
                    className={({ isActive }) => `block rounded-[3px] px-3 py-2.5 text-[14px] ${
                      isActive ? 'text-[#e8dfc9]' : 'text-[#929188] hover:text-[#e8dfc9]'
                    }`}>
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
          学习标记仅保存在当前浏览器中，不构成云端账户或长期备份。
        </p>
        <p className="mt-2">
          MathForge · 让理解先于记忆 ·{' '}
          <a href={GITHUB_REPOSITORY_URL} target="_blank" rel="noreferrer" className="hover:text-[#cfc7b5]">GitHub 开放协作</a>
        </p>
      </footer>
    </div>
  )
}
