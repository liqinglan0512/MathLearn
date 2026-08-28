import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Sigma } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { isValidAccount } from '@/lib/auth-validation'
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
      <Sigma className="mx-auto h-8 w-8 text-[#c7ad70]" />
      <p className="mt-4 text-center text-[10px] tracking-[0.2em] text-[#a58e60]">LOCAL IDENTITY PROTOTYPE</p>
      <h1 className="mt-3 text-center text-2xl font-semibold">本地原型登录</h1>
      <p className="mt-2 text-center text-sm leading-6 text-neutral-400">
        仅供本机开发功能使用，不会创建云端账户。请勿输入或复用真实密码。
      </p>
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
        <Link to="/register" className="text-[#c7ad70] hover:underline">
          创建本地测试身份
        </Link>
      </p>
    </div>
  )
}
