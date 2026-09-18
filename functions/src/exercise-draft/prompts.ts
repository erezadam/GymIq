/**
 * Prompt builder for generateExerciseDraft.
 * System prompt = EXERCISE_RECORD_RULES_MD (single source of truth, generated
 * at prebuild) + runtime injection of the LIVE controlled values from Firestore
 * (muscles, sub-muscles, active equipment, active reportTypes), the gym
 * equipment notes (settings/gymEquipmentNotes), and — when the request came
 * from a photo — the photographed-equipment constraint.
 */

import { EXERCISE_RECORD_RULES_MD } from '../generated/promptSources.generated'
import type { DraftPhotoInput, LiveCatalogs } from './types'

const OUTPUT_FORMAT = `
## פורמט הפלט (חובה — JSON בלבד)
החזר אובייקט JSON יחיד, ללא טקסט נוסף, במבנה המדויק הזה:
{
  "draft": {
    "name": string,
    "nameHe": string,
    "category": string,
    "primaryMuscle": string,
    "secondaryMuscles": string[],
    "secondaryMuscleCredits": string[],
    "equipment": string,
    "difficulty": "beginner" | "intermediate" | "advanced",
    "complexity": "compound" | "simple",
    "reportType": string,
    "assistanceTypes": ("graviton" | "bands")[],
    "availableBands": string[],
    "instructions": string[],
    "instructionsHe": string[],
    "tips": string[],
    "tipsHe": string[],
    "targetMuscles": string[]
  },
  "poseSpec": {
    "bodyPosition": string,
    "cameraAngle": string,
    "equipmentPlacement": string,
    "endPose": string,
    "startPose": string,
    "muscleOverlay": string,
    "panelLayout": string
  }
}
כללים קשיחים לפלט:
- ב-draft אין לכלול imageUrl ואין לכלול videoWebpUrl — בשום מקרה.
- כל שדה מבוקר (category / primaryMuscle / equipment / reportType / secondaryMuscles /
  secondaryMuscleCredits / targetMuscles) חייב להיות id מרשימות הערכים החיים שלמטה בלבד.
- instructions/instructionsHe: 3-5 שלבים. tips/tipsHe: 0-3.
- panelLayout תמיד "horizontal, RTL".
`

function idList(ids: Set<string>): string {
  return [...ids].sort().join(', ')
}

export function buildSystemPrompt(catalogs: LiveCatalogs, photo?: DraftPhotoInput): string {
  const parts: string[] = [EXERCISE_RECORD_RULES_MD]

  parts.push(`
## ערכים חיים מ-Firestore (מקור אמת בזמן ריצה — עוקף כל רשימה סטטית למעלה)
- category חוקיים (document-id של muscles): ${idList(catalogs.muscleIds)}
- primaryMuscle חוקיים (תת-שרירים, או '' ריק): ${idList(catalogs.subMuscleIds)}
- equipment פעיל בלבד: ${idList(catalogs.equipmentActiveIds)}
- reportType פעיל בלבד: ${idList(catalogs.reportTypeActiveIds)}`)

  if (catalogs.gymEquipmentNotes.trim()) {
    parts.push(`\n## הערות ציוד המכון (settings/gymEquipmentNotes)\n${catalogs.gymEquipmentNotes.trim()}`)
  }

  if (photo) {
    parts.push(
      `\n## Equipment as photographed\nEquipment as photographed: ${photo.labelText}, ${photo.machineType}, equipment id ${photo.equipmentId} — equipmentPlacement must match.`
    )
  }

  parts.push(OUTPUT_FORMAT)
  return parts.join('\n')
}

export function buildUserPrompt(input: { name?: string; photo?: DraftPhotoInput }): string {
  if (input.name && input.photo) {
    return `בנה רשומת תרגיל מלאה + poseSpec עבור התרגיל: "${input.name}" (המכשיר צולם: ${input.photo.labelText}, ${input.photo.machineType}).`
  }
  if (input.name) {
    return `בנה רשומת תרגיל מלאה + poseSpec עבור התרגיל: "${input.name}".`
  }
  return `בנה רשומת תרגיל מלאה + poseSpec עבור התרגיל המרכזי המבוצע על המכשיר שצולם: ${input.photo!.labelText}, ${input.photo!.machineType} (equipment id: ${input.photo!.equipmentId}).`
}
