// 一个轻量安全的数学表达式求值器：支持 + - * / ^、括号、
// 常用函数（sin cos tan asin acos atan exp ln log sqrt abs sinh cosh tanh floor ceil min max）、
// 常量 pi、e，以及变量 x 与可调参数 a b c d。

export type Scope = Record<string, number>

type Token =
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'op'; v: string }

const FUNCS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  exp: Math.exp,
  ln: Math.log,
  log: (x) => Math.log10(x),
  log2: Math.log2,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
}

const CONSTS: Record<string, number> = { pi: Math.PI, π: Math.PI, e: Math.E }

function tokenize(src: string): Token[] {
  const s = src.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
  const tokens: Token[] = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < s.length && /[0-9.]/.test(s[j])) j++
      tokens.push({ t: 'num', v: parseFloat(s.slice(i, j)) })
      i = j
    } else if (/[a-zA-Zπ]/.test(ch)) {
      let j = i
      while (j < s.length && /[a-zA-Z0-9π]/.test(s[j])) j++
      tokens.push({ t: 'name', v: s.slice(i, j).toLowerCase() })
      i = j
    } else if ('+-*/^(),'.includes(ch)) {
      tokens.push({ t: 'op', v: ch })
      i++
    } else {
      throw new Error(`无法识别的字符「${ch}」`)
    }
  }
  return tokens
}

// 隐式乘法：2x、(x)(y)、2(x)、)( 、数字+函数名
function insertImplicitMul(tokens: Token[]): Token[] {
  const out: Token[] = []
  for (let k = 0; k < tokens.length; k++) {
    const cur = tokens[k]
    const prev = out[out.length - 1]
    if (prev) {
      const prevEnd = prev.t === 'num' || prev.t === 'name' || (prev.t === 'op' && prev.v === ')')
      const curStart = cur.t === 'num' || cur.t === 'name' || (cur.t === 'op' && cur.v === '(')
      // name 后紧跟 ( 视为函数调用，不插 *
      const isCall = cur.t === 'op' && cur.v === '(' && prev.t === 'name' && FUNCS[prev.v]
      if (prevEnd && curStart && !isCall) out.push({ t: 'op', v: '*' })
    }
    out.push(cur)
  }
  return out
}

export function compile(src: string): (scope: Scope) => number {
  const tokens = insertImplicitMul(tokenize(src))
  let pos = 0
  const peek = () => tokens[pos]
  const eat = () => tokens[pos++]

  function parseExpr(): (s: Scope) => number {
    let left = parseTerm()
    while (peek()?.t === 'op' && (peek() as { v: string }).v !== undefined && ['+', '-'].includes((peek() as { v: string }).v)) {
      const op = (eat() as { v: string }).v
      const right = parseTerm()
      const l = left
      left = op === '+' ? (s) => l(s) + right(s) : (s) => l(s) - right(s)
    }
    return left
  }
  function parseTerm(): (s: Scope) => number {
    let left = parseUnary()
    while (peek()?.t === 'op' && ['*', '/'].includes((peek() as { v: string }).v)) {
      const op = (eat() as { v: string }).v
      const right = parseUnary()
      const l = left
      left = op === '*' ? (s) => l(s) * right(s) : (s) => l(s) / right(s)
    }
    return left
  }
  function parseUnary(): (s: Scope) => number {
    const tk = peek()
    if (tk?.t === 'op' && tk.v === '-') {
      eat()
      const v = parseUnary()
      return (s) => -v(s)
    }
    if (tk?.t === 'op' && tk.v === '+') {
      eat()
      return parseUnary()
    }
    return parsePower()
  }
  function parsePower(): (s: Scope) => number {
    const base = parseAtom()
    const tk = peek()
    if (tk?.t === 'op' && tk.v === '^') {
      eat()
      const exp = parseUnary() // 右结合
      return (s) => Math.pow(base(s), exp(s))
    }
    return base
  }
  function parseAtom(): (s: Scope) => number {
    const tk = eat()
    if (!tk) throw new Error('表达式不完整')
    if (tk.t === 'num') return () => tk.v
    if (tk.t === 'name') {
      if (FUNCS[tk.v]) {
        const open = eat()
        if (!open || open.t !== 'op' || open.v !== '(') throw new Error(`函数 ${tk.v} 后需要括号`)
        const args: ((s: Scope) => number)[] = [parseExpr()]
        while (peek()?.t === 'op' && (peek() as { v: string }).v === ',') {
          eat()
          args.push(parseExpr())
        }
        const close = eat()
        if (!close || close.t !== 'op' || close.v !== ')') throw new Error('缺少右括号')
        const f = FUNCS[tk.v]
        return (s) => f(...args.map((g) => g(s)))
      }
      if (tk.v in CONSTS) return () => CONSTS[tk.v]
      return (s) => {
        const v = s[tk.v]
        if (v === undefined) throw new Error(`未知变量「${tk.v}」（可用：x, a, b, c, d, pi, e）`)
        return v
      }
    }
    if (tk.t === 'op' && tk.v === '(') {
      const e = parseExpr()
      const close = eat()
      if (!close || close.t !== 'op' || close.v !== ')') throw new Error('缺少右括号')
      return e
    }
    throw new Error('表达式语法错误')
  }

  const fn = parseExpr()
  if (pos < tokens.length) throw new Error('表达式末尾有多余内容')
  return fn
}

export function evaluate(src: string, scope: Scope = {}): number {
  return compile(src)(scope)
}
