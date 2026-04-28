/**
 * Parses CHANGELOG.md and imports each bullet under a `## [version] - date`
 * (or `## version` / `## date`) heading as a `draft` release note.
 *
 * Deduplication is done via SHA-256 of the bullet text — a bullet that was
 * already imported in a previous run will be skipped. The hash is stored on
 * the note as `changelogHash`; `checkExistsByHash()` is the lookup.
 *
 * ## Usage
 *
 *   npm run sync:release-notes
 *
 * The script creates DRAFTS only. An admin must review them in the
 * "הודעות עדכון" screen and explicitly publish each one.
 *
 * Requires ADMIN_EMAIL / ADMIN_PASSWORD in .env.local.
 */

import { auth } from './firebase-config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import {
  checkExistsByHash,
  createReleaseNote,
} from '../src/lib/firebase/releaseNotes'

config({ path: '.env.local' })

interface ChangelogSection {
  version: string
  bullets: string[]
}

const VERSION_LINE_RE = /^##\s+(.+?)\s*$/
const VERSION_IN_BRACKETS_RE = /\[([^\]]+)\]/
const BULLET_RE = /^\s*[-*]\s+(.+?)\s*$/

function parseChangelog(content: string): ChangelogSection[] {
  const lines = content.split('\n')
  const sections: ChangelogSection[] = []
  let current: ChangelogSection | null = null

  for (const line of lines) {
    const headingMatch = line.match(VERSION_LINE_RE)
    if (headingMatch) {
      const heading = headingMatch[1]
      const bracketMatch = heading.match(VERSION_IN_BRACKETS_RE)
      const version = (bracketMatch ? bracketMatch[1] : heading).trim()
      current = { version, bullets: [] }
      sections.push(current)
      continue
    }
    const bulletMatch = line.match(BULLET_RE)
    if (bulletMatch && current) {
      const text = bulletMatch[1].trim()
      if (text.length > 0) current.bullets.push(text)
    }
  }

  return sections.filter((s) => s.bullets.length > 0)
}

function hashBullet(version: string, bullet: string): string {
  return createHash('sha256').update(`${version}::${bullet}`).digest('hex')
}

function truncateTitle(text: string, max = 100): string {
  const stripped = text.replace(/\*\*/g, '').replace(/`/g, '').trim()
  return stripped.length <= max ? stripped : stripped.slice(0, max - 1) + '…'
}

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.error('❌ Missing ADMIN_EMAIL / ADMIN_PASSWORD in .env.local')
    process.exit(1)
  }

  console.log(`🔐 Signing in as ${email}…`)
  await signInWithEmailAndPassword(auth, email, password)
  console.log('✅ Authenticated')
  console.log('')

  const path = resolve(process.cwd(), 'CHANGELOG.md')
  console.log(`📄 Reading ${path}`)
  const content = await readFile(path, 'utf8')

  const sections = parseChangelog(content)
  const totalBullets = sections.reduce((acc, s) => acc + s.bullets.length, 0)
  console.log(`   Found ${sections.length} version(s) / ${totalBullets} bullet(s)`)
  console.log('')

  let created = 0
  let skipped = 0

  for (const section of sections) {
    for (const bullet of section.bullets) {
      const hash = hashBullet(section.version, bullet)
      const exists = await checkExistsByHash(hash)
      if (exists) {
        skipped += 1
        continue
      }
      await createReleaseNote({
        version: section.version,
        changelogHash: hash,
        titleHe: truncateTitle(bullet),
        bodyHe: bullet,
        iconEmoji: '🎁',
        status: 'draft',
        audience: 'all',
        order: 0,
      })
      created += 1
      console.log(`   ➕ draft: [${section.version}] ${truncateTitle(bullet, 60)}`)
    }
  }

  console.log('')
  console.log(`🎉 Sync complete. Created ${created} new draft(s). Skipped ${skipped} existing.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Sync failed:', err)
  process.exit(1)
})
