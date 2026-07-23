/**
 * Drift guard: the admin prompt library shows a verbatim copy of the built-in
 * server defaults (src/domains/admin/data/aiPromptRegistry.ts). The runtime
 * default lives server-side. If someone edits one side and forgets the other,
 * the admin screen lies about what the model actually receives.
 *
 * Note on the "behavioral tests only" iron rule: this is intentionally a
 * source-level comparison — the property under test IS the equality of two
 * source texts, so reading both sources is the behavioral check here (there is
 * no runtime behavior that could detect the drift).
 *
 * Extraction relies on the prompt template literals containing no backticks —
 * the guard fails loudly if the markers are not found.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { AI_PROMPT_REGISTRY } from '@/domains/admin/data/aiPromptRegistry'

const root = resolve(__dirname, '..')

function extractTemplateLiteral(filePath: string, startMarker: string): string {
  const source = readFileSync(resolve(root, filePath), 'utf8')
  const markerAt = source.indexOf(startMarker)
  expect(markerAt, `marker "${startMarker}" not found in ${filePath}`).toBeGreaterThan(-1)
  const open = source.indexOf('`', markerAt)
  expect(open, `no opening backtick after marker in ${filePath}`).toBeGreaterThan(-1)
  // Walk to the closing backtick, honoring escaped backticks (\`)
  let close = open + 1
  while (close < source.length) {
    if (source[close] === '\\') { close += 2; continue }
    if (source[close] === '`') break
    close++
  }
  expect(close, `no closing backtick in ${filePath}`).toBeLessThan(source.length)
  let raw = source.slice(open + 1, close)
  // The server built-in may interpolate known template variables directly
  // (${daysPerWeek}); the registry copy carries them as {{daysPerWeek}}
  // placeholders resolved by applyPromptTemplate. Normalize before comparing.
  raw = raw.replace(/\$\{(\w+)\}/g, '{{$1}}')
  // Anything more complex than a bare variable cannot be represented in the
  // admin copy — fail loudly instead of comparing garbage.
  expect(raw.includes('${'), `unsupported \${...} expression in ${filePath}`).toBe(false)
  // Resolve template-literal escape sequences the way TypeScript does,
  // without evaluating any code (no new Function / eval).
  return unescapeTemplateLiteral(raw)
}

const TEMPLATE_ESCAPES: Record<string, string> = {
  '\\': '\\',
  '`': '`',
  $: '$',
  n: '\n',
  r: '\r',
  t: '\t',
  "'": "'",
  '"': '"',
}

function unescapeTemplateLiteral(raw: string): string {
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== '\\') { out += raw[i]; continue }
    const next = raw[i + 1]
    const mapped = TEMPLATE_ESCAPES[next]
    expect(mapped, `unsupported escape sequence \\${next} — extend TEMPLATE_ESCAPES`).toBeDefined()
    out += mapped
    i++
  }
  return out
}

function registryPrompt(id: string): string {
  const def = AI_PROMPT_REGISTRY.find((d) => d.id === id)
  expect(def, `registry entry "${id}" missing`).toBeDefined()
  return def!.defaultSystemPrompt
}

describe('prompt registry stays in sync with built-in server defaults', () => {
  it('workout_generation matches functions/src/ai-trainer/openaiClient.ts buildSystemPrompt', () => {
    const serverPrompt = extractTemplateLiteral(
      'functions/src/ai-trainer/openaiClient.ts',
      'function buildSystemPrompt(): string {'
    )
    expect(registryPrompt('workout_generation')).toBe(serverPrompt)
  })

  it('training_analysis matches functions/src/ai-analysis/generateAnalysis.ts buildSystemPrompt', () => {
    const serverPrompt = extractTemplateLiteral(
      'functions/src/ai-analysis/generateAnalysis.ts',
      'function buildSystemPrompt('
    )
    expect(registryPrompt('training_analysis')).toBe(serverPrompt)
  })

  it('program_builder matches functions/src/ai-program/generateProgram.ts buildSystemPrompt', () => {
    const serverPrompt = extractTemplateLiteral(
      'functions/src/ai-program/generateProgram.ts',
      'function buildSystemPrompt('
    )
    expect(registryPrompt('program_builder')).toBe(serverPrompt)
  })

  it('release_note_drafter matches scripts/draftReleaseNoteFromPR.ts SYSTEM_PROMPT', () => {
    const serverPrompt = extractTemplateLiteral(
      'scripts/draftReleaseNoteFromPR.ts',
      'const SYSTEM_PROMPT'
    )
    expect(registryPrompt('release_note_drafter')).toBe(serverPrompt)
  })
})
