import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Sigma } from 'lucide-react'
import { useAuth, isValidAccount } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const msg = login(account, password)
    if (msg) setErr(msg)
    else nav(-1)
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <Sigma className="mx-auto h-8 w-8 text-indigo-300" />
      <h1 className="mt-4 text-center text-2xl font-semibold">登录 MathForge</h1>
      <p className="mt-2 text-center text-sm text-neutral-400">登录后可上传解法、参与讨论</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="account">邮箱或手机号</Label>
          <Input
            id="account"
            className="mt-1.5"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="you@example.com 或 11 位手机号"
            autoComplete="username"
          />
        </div>
        <div>
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            className="mt-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <Button className="w-full" type="submit" disabled={!isValidAccount(account.trim()) || !password}>
          登录
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-400">
        还没有账号？{' '}
        <Link to="/register" className="text-indigo-300 hover:underline">
          立即注册
        </Link>
      </p>
    </div>
  )
}
