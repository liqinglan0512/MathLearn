import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Sigma } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
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
      <Sigma className="mx-auto h-8 w-8 text-[#c7ad70]" />
      <p className="mt-4 text-center text-[10px] tracking-[0.2em] text-[#a58e60]">LOCAL IDENTITY PROTOTYPE</p>
      <h1 className="mt-3 text-center text-2xl font-semibold">创建本地测试身份</h1>
      <p className="mt-2 text-center text-sm leading-6 text-neutral-400">
        数据只保存在当前浏览器，不会创建云端账户。请勿填写真实账户或复用真实密码。
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="name">昵称</Label>
          <Input id="name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="仅用于本地原型显示" />
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
          保存到本机并登录
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-400">
        已有账号？{' '}
        <Link to="/login" className="text-[#c7ad70] hover:underline">
          返回本地登录
        </Link>
      </p>
      <p className="mt-8 text-center text-xs text-neutral-400">
        此功能没有服务端验证、密码找回或跨设备同步，不构成正式身份系统。
      </p>
    </div>
  )
}
