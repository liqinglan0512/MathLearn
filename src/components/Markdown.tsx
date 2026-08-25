import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

/** Keep authored code literal while accepting both TeX and Markdown math delimiters. */
function normalizeMathDelimiters(content: string): string {
  const sections = /(`{3,}[^\n]*\n[\s\S]*?\n`{3,}|~{3,}[^\n]*\n[\s\S]*?\n~{3,}|`[^`\n]*`|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\))/g

  return content.replace(sections, (matched: string, _section: string, display: string | undefined, inline: string | undefined, offset: number) => {
    if (display === undefined && inline === undefined) return matched

    let precedingSlashes = 0
    for (let index = offset - 1; index >= 0 && content[index] === '\\'; index -= 1) {
      precedingSlashes += 1
    }
    if (precedingSlashes % 2 !== 0) return matched

    if (display !== undefined) return `\n\n$$\n${display.trim()}\n$$\n\n`
    return `$${inline?.trim() ?? ''}$`
  })
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={`md ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a({ href, children }) {
            if (href?.startsWith('/') && !href.startsWith('//')) {
              return <Link to={href}>{children}</Link>
            }

            const external = href?.startsWith('https://') || href?.startsWith('http://')
            return (
              <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer noopener' : undefined}>
                {children}
              </a>
            )
          },
        }}
      >
        {normalizeMathDelimiters(content)}
      </ReactMarkdown>
    </div>
  )
}
