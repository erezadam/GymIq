import ReactMarkdown from 'react-markdown'

interface MarkdownContentProps {
  content: string
  className?: string
}

const ALLOWED_ELEMENTS = [
  'p',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'br',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'code',
  'blockquote',
]

/**
 * Safe Markdown renderer for release-notes content.
 *
 * - Uses react-markdown's default CommonMark parser (no plugins).
 * - No rehype-raw, no HTML passthrough, no user-controlled HTML.
 * - Tags outside the allowlist are stripped (content preserved via unwrap).
 * - External links open in a new tab with rel="noopener noreferrer".
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={
        className ??
        'prose prose-invert prose-sm max-w-none text-on-surface leading-relaxed break-words'
      }
      dir="rtl"
    >
      <ReactMarkdown
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-main hover:underline"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 text-on-surface">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mt-3 mb-2 text-on-surface">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-3 mb-1 text-on-surface">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold mt-2 mb-1 text-on-surface">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pr-5 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pr-5 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-bold text-on-surface">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-surface-container text-primary-main text-sm font-mono">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-r-4 border-primary-main pr-3 my-2 text-on-surface-variant italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
