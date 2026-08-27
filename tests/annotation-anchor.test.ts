import { describe, expect, it } from 'vitest'
import { resolvePassageAnchor } from '../src/lib/annotations'

const original = '先说明条件。固定量词顺序：对任意误差，存在阈值。然后继续证明。'
const start = original.indexOf('固定量词顺序')
const quote = '固定量词顺序：对任意误差，存在阈值。'
const anchor = {
  start,
  end: start + quote.length,
  quote,
  prefix: original.slice(start - 6, start),
  suffix: original.slice(start + quote.length, start + quote.length + 6),
}

describe('resolvePassageAnchor', () => {
  it('uses the original offsets when the block is unchanged', () => {
    expect(resolvePassageAnchor(anchor, original)).toEqual({ start, end: start + quote.length })
  })

  it('re-anchors after text is inserted earlier in the semantic block', () => {
    const edited = `新增说明。${original}`
    const nextStart = edited.indexOf(quote)
    expect(resolvePassageAnchor(anchor, edited)).toEqual({ start: nextStart, end: nextStart + quote.length })
  })

  it('uses context to choose the correct repeated quote', () => {
    const repeated = `另一处：${quote} ${original}`
    const nextStart = repeated.lastIndexOf(quote)
    expect(resolvePassageAnchor(anchor, repeated)).toEqual({ start: nextStart, end: nextStart + quote.length })
  })

  it('does not guess when neither stored context matches', () => {
    expect(resolvePassageAnchor(anchor, `完全不同的上下文：${quote} 结尾。`)).toBeNull()
  })
})
