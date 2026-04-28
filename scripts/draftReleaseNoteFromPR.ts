/**
 * Generates a Hebrew "What's New" draft for a merged PR using Claude Haiku,
 * then writes (or updates, if a draft for the same PR already exists) it to
 * the `releaseNotes` collection as `status: 'draft'`. Admin reviews and
 * publishes from `/admin/release-notes`.
 *
 * Triggered automatically by `.github/workflows/auto-draft-release-note.yml`
 * after every successful production deploy.
 *
 * Usage: npm run draft:release-note -- --pr 123
 *
 * Required env (all set by the workflow from GitHub Secrets):
 *   ANTHROPIC_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD,
 *   VITE_FIREBASE_* (×6), GH_TOKEN, GITHUB_REPOSITORY
 *
 * Note on naming: ADMIN_EMAIL / ADMIN_PASSWORD were renamed from
 * E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD when Playwright was removed from the
 * project. The E2E_ prefix was historical and misleading — these credentials
 * have always been plain admin login creds, never tied to any test framework.
 *
 * Idempotency: dedup is by `changelogHash = "pr:${PR}"`. Re-running for the
 * same PR updates the existing draft instead of creating a duplicate.
 *
 * Skip rule: if Claude returns an empty `titleHe` (purely internal PR with
 * no user-visible change), no draft is written.
 */

import Anthropic from '@anthropic-ai/sdk'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { signInWithEmailAndPassword } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, auth } from './firebase-config'

const COLLECTION_NAME = 'releaseNotes'

interface DraftPayload {
  titleHe: string
  bodyHe: string
  iconEmoji: string
}

const SYSTEM_PROMPT = `אתה עוזר שכותב עדכוני גרסה עבור משתמשי האפליקציה GymIQ — אפליקציית כושר בעברית.
המשתמשים אינם מפתחים. הם רואים רק את השינוי הגלוי במסך.

כללים:
1. כתוב **בדיוק 3 משפטים בעברית**. אם השינוי קטן מאוד — 1-2 משפטים זה בסדר.
2. כל משפט בשורה נפרדת.
3. ללא מונחים טכניים, שמות קבצים, שמות פונקציות, או מינוח של מפתחים.
4. השתמש בלשון פעילה. התחל ב"תוקן" / "נוסף" / "שופר" / "שונה" לפי סוג השינוי.
5. הכותרת קצרה, עד 60 תווים, מתארת את הפיצ'ר ולא את ה-PR.
6. בחר אימוג'י אחד מתאים: 🎁 (פיצ'ר), 🐛 (תיקון), ✨ (שיפור), 🎨 (עיצוב), ⚡ (ביצועים).
7. אם השינוי פנימי בלבד (CI, טסטים, רפקטור ללא אפקט גלוי, תלויות) — החזר titleHe ריק ("") כדי לדלג.

החזר JSON תקין בלבד, ללא טקסט נוסף, ללא markdown fences:
{"titleHe": "...", "bodyHe": "משפט 1.\\nמשפט 2.\\nמשפט 3.", "iconEmoji": "🎁"}`

function parsePrFlag(): string {
  const idx = process.argv.indexOf('--pr')
  const value = idx >= 0 ? process.argv[idx + 1] : undefined
  if (!value || !/^\d+$/.test(value)) {
    console.error('❌ Missing or invalid --pr <number>')
    process.exit(1)
  }
  return value
}

function fetchPrContext(prNumber: string): {
  title: string
  body: string
  commits: string[]
  files: string[]
} {
  const raw = execSync(
    `gh pr view ${prNumber} --json title,body,commits,files`,
    { encoding: 'utf8' }
  )
  const parsed = JSON.parse(raw)
  return {
    title: parsed.title ?? '',
    body: parsed.body ?? '',
    commits: (parsed.commits ?? []).map((c: { messageHeadline: string }) => c.messageHeadline),
    files: (parsed.files ?? []).map((f: { path: string }) => f.path),
  }
}

function buildUserPrompt(ctx: ReturnType<typeof fetchPrContext>): string {
  return [
    `כותרת ה-PR: ${ctx.title}`,
    '',
    'תיאור:',
    ctx.body || '(ריק)',
    '',
    'קומיטים:',
    ctx.commits.map((c) => `- ${c}`).join('\n') || '(ללא)',
    '',
    'קבצים שהשתנו:',
    ctx.files.map((f) => `- ${f}`).join('\n') || '(ללא)',
  ].join('\n')
}

function extractJson(text: string): DraftPayload {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  const parsed = JSON.parse(trimmed)
  if (typeof parsed.titleHe !== 'string' || typeof parsed.bodyHe !== 'string') {
    throw new Error(`Invalid draft payload: ${trimmed}`)
  }
  return {
    titleHe: parsed.titleHe,
    bodyHe: parsed.bodyHe,
    iconEmoji: typeof parsed.iconEmoji === 'string' ? parsed.iconEmoji : '🎁',
  }
}

async function generateDraft(ctx: ReturnType<typeof fetchPrContext>): Promise<DraftPayload> {
  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: buildUserPrompt(ctx) }],
  })
  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') {
    throw new Error('Anthropic response had no text block')
  }
  return extractJson(block.text)
}

function readVersion(): string {
  try {
    const raw = readFileSync(resolve(process.cwd(), 'public/version.json'), 'utf8')
    const parsed = JSON.parse(raw)
    return typeof parsed.version === 'string' ? parsed.version : 'unknown'
  } catch {
    return 'unknown'
  }
}

async function findExistingDraftId(dedupHash: string): Promise<string | null> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('changelogHash', '==', dedupHash)
  )
  const snap = await getDocs(q)
  const match = snap.docs.find((d) => d.data().status === 'draft')
  return match ? match.id : null
}

async function main() {
  const prNumber = parsePrFlag()
  const dedupHash = `pr:${prNumber}`

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Missing ANTHROPIC_API_KEY')
    process.exit(1)
  }
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.error('❌ Missing ADMIN_EMAIL / ADMIN_PASSWORD')
    process.exit(1)
  }

  console.log(`📥 Fetching PR #${prNumber} context…`)
  const ctx = fetchPrContext(prNumber)

  console.log('🤖 Asking Claude Haiku for a 3-sentence Hebrew draft…')
  const draft = await generateDraft(ctx)

  if (!draft.titleHe.trim()) {
    console.log(`⏭️  PR #${prNumber} flagged as internal-only — no draft written.`)
    process.exit(0)
  }

  console.log(`🔐 Signing in as ${email}…`)
  await signInWithEmailAndPassword(auth, email, password)

  const version = readVersion()
  const existingId = await findExistingDraftId(dedupHash)

  if (existingId) {
    await updateDoc(doc(db, COLLECTION_NAME, existingId), {
      titleHe: draft.titleHe,
      bodyHe: draft.bodyHe,
      iconEmoji: draft.iconEmoji,
      version,
      updatedAt: serverTimestamp(),
    })
    console.log(`✏️  Updated existing draft ${existingId} for PR #${prNumber}`)
  } else {
    const ref = await addDoc(collection(db, COLLECTION_NAME), {
      version,
      changelogHash: dedupHash,
      titleHe: draft.titleHe,
      bodyHe: draft.bodyHe,
      iconEmoji: draft.iconEmoji,
      status: 'draft',
      publishedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      audience: 'all',
      order: 0,
    })
    console.log(`✅ Created draft ${ref.id} for PR #${prNumber}`)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ draft:release-note failed:', err)
  process.exit(1)
})
