import { useMemo, useState, type ReactNode } from 'react'
import { store, uid } from './store'
import type { User } from './types'
import { AuthContext, type AuthContextValue } from './auth-context'
import { isValidAccount } from './auth-validation'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const id = store.session
    return id ? (store.users().find((u) => u.id === id) ?? null) : null
  })

  const api = useMemo<AuthContextValue>(
    () => ({
      user,
      login(account, password) {
        const u = store.users().find((x) => x.account === account.trim())
        if (!u) return '账号不存在，请先注册'
        if (u.password !== password) return '密码不正确'
        store.session = u.id
        setUser(u)
        return null
      },
      register(name, account, password) {
        account = account.trim()
        if (!name.trim()) return '请填写昵称'
        if (!isValidAccount(account)) return '请输入有效的邮箱或 11 位手机号'
        if (password.length < 6) return '密码至少 6 位'
        if (store.users().some((x) => x.account === account)) return '该账号已注册，请直接登录'
        const u: User = { id: uid(), name: name.trim(), account, password, isAdmin: false, createdAt: Date.now() }
        store.addUser(u)
        store.session = u.id
        setUser(u)
        return null
      },
      logout() {
        store.session = null
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}
