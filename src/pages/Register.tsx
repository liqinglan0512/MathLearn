import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Sigma } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const msg = register(name, account, password)
    if (msg) setErr(msg)
    else nav('/')
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <Sigma className="mx-auto h-8 w-8 text-indigo-300" />
      <h1 className="mt-4 text-center text-2xl font-semibold">注册 MathForge</h1>
      <p className="mt-2 text-center text-sm text-neutral-400">中国场景：支持邮箱或手机号注册</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="name">昵称</Label>
          <Input id="name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="将显示在你的解法旁" />
        </div>
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
          <Label htmlFor="password">密码（至少 6 位）</Label>
          <Input
            id="password"
            type="password"
            className="mt-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <Button className="w-full" type="submit">
          注册并登录
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-400">
        已有账号？{' '}
        <Link to="/login" className="text-indigo-300 hover:underline">
          去登录
        </Link>
      </p>
      <p className="mt-8 text-center text-xs text-neutral-400">
        演示版：账号数据保存在本机浏览器中；正式版将接入后端与短信/邮箱验证。
      </p>
    </div>
  )
}
