import katex from 'katex'
import { Fragment, type ReactNode } from 'react'

/**
 * 在现有 p、li、h1 或 span 内渲染数学公式，不额外生成段落节点。
 * trust 始终关闭，读者留言中的 TeX 也不会获得 HTML 注入能力。
 */
export function MathProse({ content }: { content: string }) {
  const expression = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\\)\$((?:\\[\s\S]|[^$])+?)(?<!\\)\$/g
  const children: ReactNode[] = []
  let cursor = 0

  for (const match of content.matchAll(expression)) {
    const start = match.index
    if (start > cursor) children.push(content.slice(cursor, start))

    const source = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? '').trim()
    const displayMode = match[1] !== undefined || match[2] !== undefined
    const html = katex.renderToString(source, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    })

    children.push(
      <span
        key={`math-${start}`}
        className={displayMode ? 'block max-w-full overflow-x-auto' : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />,
    )
    cursor = start + match[0].length
  }

  if (cursor < content.length) children.push(content.slice(cursor))
  if (children.length === 0) return <>{content}</>

  return <>{children.map((child, index) => <Fragment key={index}>{child}</Fragment>)}</>
}
