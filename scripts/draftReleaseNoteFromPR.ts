/**
 * Auto-drafts a release note from a merged PR.
 *
 * Reads PR title/body/commits/files via `gh pr view`, asks Claude Haiku 4.5
 * for a 3-sentence Hebrew summary aimed at end users, and creates a `draft`
 * release note in Firestore. The admin reviews and publishes from the
 * existing `/admin/release-notes` UI.
 *
 * Idempotent: each PR has a deterministic dedup key (`changelogHash =
 * "pr_<number>"`). Re-runs update the existing draft instead of duplicating.
 *
 * Skip rule: if the LLM judges there is no user-visible change (e.g. CI-only
 * or refactor PR), it returns an empty `titleHe` and the script exits without
 * touching Firestore.
 *
 * Usage:
 *   npm run draft:release-note -- --pr <number>
 *
 * Required env: ANTHROPIC_API_KEY, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD,
 * VITE_FIREBASE_* (×6), GH_TOKEN, GITHUB_REPOSITORY (set by the workflow).
 */

import Anthropic from '@anthropic-ai/sdk'
import { config } from 'dotenv'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from './firebase-config'
import {
  createReleaseNote,
  getAllReleaseNotes,
  updateReleaseNote,
} from '../src/lib/firebase/releaseNotes'

config({ path: '.env.local' })

interface PRData {
  title: string
  body: string | null
  commits: { messageHeadline: string }[]
  files: { path: string }[]
}

interface DraftPayload {
  titleHe: string
  bodyHe: string
  iconEmoji: string
}

const SYSTEM_PROMPT = `אתה עוזר שכותב עדכוני גרסה עבור משתמשי האפליקציה GymIQ — אפליקציית כושר בעברית.
המשתמשים אינם מפתחים. הם רואים רק את השינוי הגלוי במסך שלהם.

כללים:
1. כתוב **עד 3 משפטים בעברית**, כל משפט בשורה נפרדת. אם השינוי קטן — 1-2 משפטים מספיקים.
2. ללא מונחים טכניים, שמות קבצים, שמות פונקציות, או מינוח של מפתחים.
3. השתמש בלשון פעילה וקצרה. התחל ב"תוקן" / "נוסף" / "שופר" / "שונה" / "הועבר" לפי סוג השינוי.
4. הכותרת קצרה (עד 60 תווים), מתארת את הפיצ'ר עצמו ולא את ה-PR.
5. בחר אימוג'י אחד מתאים: 🎁 (פיצ'ר חדש), 🐛 (תיקון באג), ✨ (שיפור), 🎨 (עיצוב), ⚡ (ביצועים).
6. **אם השינוי הוא פנימי בלבד ואין לו ביטוי גלוי למשתמש** (למשל: שינוי CI, refactor פנימי, עדכון תלויות, שינוי בטסטים, שינוי בתיעוד) — החזר titleHe ריק והמערכת תדלג על יצירת טיוטה.

החזר JSON תקין בלבד, ללא טקסט נוסף ובלי code fences:
{"titleHe": "...", "bodyHe": "משפט 1.\\nמשפט 2.", "iconEmoji": "🎁"}`

function parsePRArg(): string {
  const i = process.argv.indexOf('--pr')
  if (i === -1 || !process.argv[i + 1]) {
    console.error('❌ Missing --pr <number>')
    process.exit(1)
  }
  return process.argv[i + 1]
}

function fetchPR(prNumber: string): PRData {
  const repo = process.env.GITHUB_REPOSITORY
  const repoArg = repo ? `--repo ${repo}` : ''
  const raw = execSync(
    `gh pr view ${prNumber} ${repoArg} --json title,body,commits,files`,
    { encoding: 'utf8' }
  )
  return JSON.parse(raw)
}

function buildUserPrompt(pr: PRData): string {
  const commitsList = pr.commits.map((c) => `- ${c.messageHeadline}`).join('\n')
  const filesList = pr.files
    .slice(0, 30) // cap to keep prompt small; first 30 files are usually enough
    .map((f) => `- ${f.path}`)
    .join('\n')
  return [
    `כותרת ה-PR:`,
    pr.title,
    ``,
    `תיאור:`,
    pr.body?.trim() || '(ריק)',
    ``,
    `קומיטים:`,
    commitsList || '(אין)',
    ``,
    `קבצים שהשתנו (עד 30 ראשונים):`,
    filesList || '(אין)',
  ].join('\n')
}

function extractJson(text: string): DraftPayload {
  // Trim code fences if the model added them despite instructions.
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }
  // Some responses wrap JSON in prose — grab the first {...} block.
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Model returned no JSON object: ${text}`)
  const parsed = JSON.parse(match[0])
  if (
    typeof parsed.titleHe !== 'string' ||
    typeof parsed.bodyHe !== 'string' ||
    typeof parsed.iconEmoji !== 'string'
  ) {
    throw new Error(`Invalid JSON shape: ${match[0]}`)
  }
  return parsed
}

async function generateDraft(pr: PRData): Promise<DraftPayload> {
  const client = new Anthropic() // reads ANTHROPIC_API_KEY from env
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: buildUserPrompt(pr) }],
  })
  const block = msg.content[0]
  if (block.type !== 'text') {
    throw new Error(`Unexpected content block type: ${block.type}`)
  }
  return extractJson(block.text)
}

function readVersion(): string {
  const path = resolve(process.cwd(), 'public/version.json')
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  return typeof raw.version === 'string' ? raw.version : ''
}

async function main() {
  const prNumber = parsePRArg()
  const dedupHash = `pr_${prNumber}`

  console.log(`🔎 Fetching PR #${prNumber}…`)
  const pr = fetchPR(prNumber)

  console.log(`🤖 Asking Claude for a 3-sentence Hebrew summary…`)
  const draft = await generateDraft(pr)

  if (!draft.titleHe.trim()) {
    console.log(
      `⏭️  LLM judged this PR as not user-visible. Skipping draft creation.`
    )
    process.exit(0)
  }

  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  if (!email || !password) {
    console.error('❌ Missing E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD')
    process.exit(1)
  }

  console.log(`🔐 Signing in as ${email}…`)
  await signInWithEmailAndPassword(auth, email, password)

  const version = readVersion()
  const drafts = await getAllReleaseNotes('draft')
  const existing = drafts.find((d) => d.changelogHash === dedupHash)

  if (existing) {
    await updateReleaseNote(existing.id, {
      version,
      titleHe: draft.titleHe,
      bodyHe: draft.bodyHe,
      iconEmoji: draft.iconEmoji,
    })
    console.log(
      `♻️  Updated existing draft ${existing.id} for PR #${prNumber} (version ${version})`
    )
  } else {
    const id = await createReleaseNote({
      version,
      changelogHash: dedupHash,
      titleHe: draft.titleHe,
      bodyHe: draft.bodyHe,
      iconEmoji: draft.iconEmoji,
      status: 'draft',
      audience: 'all',
      order: 0,
    })
    console.log(
      `➕ Created draft ${id} for PR #${prNumber} (version ${version})`
    )
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Auto-draft failed:', err)
  process.exit(1)
})
