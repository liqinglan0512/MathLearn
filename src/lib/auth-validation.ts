export function isValidAccount(account: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account) || /^1\d{10}$/.test(account)
}
