// GENERATED copy of src/domains/exercises/matching/similarExercises.ts — DO NOT EDIT (see scripts/generate-function-prompts.cjs)
/**
 * Pure similarity matching between a candidate exercise and the live catalog.
 * No firebase imports — usable from the app, scripts, and (copied) functions.
 */

// lowercase, trim, collapse whitespace, strip parenthesized content,
// strip punctuation from both ends. Single source of truth — scripts/exercise-add/lib.ts
// re-exports this.
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '')
    .trim()
}

export interface SimilarCandidate {
  name: string
  nameHe: string
  category: string
  equipment: string
}

export interface CatalogExercise extends SimilarCandidate {
  id: string
}

export interface SimilarMatch {
  id: string
  name: string
  nameHe: string
  category: string
  equipment: string
  score: number
  reasons: string[]
}

function tokens(s: string): Set<string> {
  return new Set(normalizeName(s).split(' ').filter(Boolean))
}

// Overlap ratio relative to the smaller token set (0..1).
function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const t of a) if (b.has(t)) shared++
  return shared / Math.min(a.size, b.size)
}

// Scoring: same category +3, same equipment +2, English-name token overlap
// (0..4 scaled), Hebrew-name token overlap (0..4 scaled). Name similarity is
// required — category/equipment alone never make a "similar" exercise.
export function findSimilarExercises(
  candidate: SimilarCandidate,
  catalog: CatalogExercise[],
  limit = 3
): SimilarMatch[] {
  const candNameTokens = tokens(candidate.name)
  const candHeTokens = tokens(candidate.nameHe)

  const matches: SimilarMatch[] = []
  for (const ex of catalog) {
    const nameOverlap = tokenOverlap(candNameTokens, tokens(ex.name || ''))
    const heOverlap = tokenOverlap(candHeTokens, tokens(ex.nameHe || ''))
    const nameScore = Math.max(nameOverlap, heOverlap)
    // No meaningful name similarity → not "similar", regardless of metadata.
    if (nameScore < 0.5) continue

    let score = nameOverlap * 4 + heOverlap * 4
    const reasons: string[] = []
    if (nameOverlap >= 0.5) reasons.push(`שם אנגלי דומה (${Math.round(nameOverlap * 100)}%)`)
    if (heOverlap >= 0.5) reasons.push(`שם עברי דומה (${Math.round(heOverlap * 100)}%)`)
    if (ex.category === candidate.category) {
      score += 3
      reasons.push('אותה קטגוריה')
    }
    if (ex.equipment === candidate.equipment) {
      score += 2
      reasons.push('אותו ציוד')
    } else {
      reasons.push(`ציוד שונה (${ex.equipment} לעומת ${candidate.equipment})`)
    }
    matches.push({
      id: ex.id,
      name: ex.name,
      nameHe: ex.nameHe,
      category: ex.category,
      equipment: ex.equipment,
      score: Math.round(score * 100) / 100,
      reasons,
    })
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, limit)
}
