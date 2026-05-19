import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface JsonViewerProps {
  data: unknown
  className?: string
  maxHeight?: string
}

export function JsonViewer({ data, className = '', maxHeight = 'max-h-96' }: JsonViewerProps) {
  const [copied, setCopied] = useState(false)
  const formatted = safeStringify(data)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      toast.success('הועתק ל-clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('שגיאה בהעתקה')
    }
  }

  return (
    <div className={`relative rounded-lg bg-dark-bg border border-dark-border ${className}`}>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 left-2 p-1.5 rounded-md bg-dark-surface hover:bg-dark-border text-text-muted hover:text-text-primary transition-colors"
        aria-label="העתק JSON"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre
        dir="ltr"
        className={`p-4 pt-10 text-xs font-mono text-text-primary overflow-auto ${maxHeight} whitespace-pre`}
      >
        {formatted}
      </pre>
    </div>
  )
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, replacer, 2)
  } catch (err) {
    return `// failed to stringify: ${err instanceof Error ? err.message : 'unknown'}`
  }
}

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object' && 'toDate' in value) {
    const fn = (value as { toDate: () => Date }).toDate
    if (typeof fn === 'function') return fn.call(value).toISOString()
  }
  return value
}
