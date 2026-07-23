/**
 * Pure helpers for the AI prompt advisor (admin prompt library consultation).
 *
 * Kept free of firebase/openai imports so vitest can exercise the prompt
 * building and response parsing directly (same pattern as
 * shared/promptOverrides.ts and ai-trainer/stagnationFloor.ts).
 */

export interface AdvisorResult {
  /** Short Hebrew analysis of the current prompt vs. the admin's goal. */
  analysis: string
  /** Concrete Hebrew recommendations, each one actionable. */
  recommendations: string[]
  /** Full revised prompt implementing the recommendations. */
  revisedPrompt: string
}

export function buildAdvisorSystemPrompt(): string {
  return `אתה יועץ מומחה לכתיבת פרומפטים (Prompt Engineering) עבור מודלי שפה.
אתה מקבל: פרומפט מערכת קיים של פיצ'ר AI באפליקציית כושר בעברית (GymIQ), ובקשת שינוי מהמנהל.

תפקידך:
1. לנתח את הפרומפט הקיים ביחס לבקשה — מה עובד, מה חסר, ומה עלול להישבר.
2. לתת המלצות קונקרטיות (לא כלליות) — כל המלצה מציינת איזה חלק בפרומפט לשנות וכיצד.
3. לכתוב גרסה מתוקנת מלאה של הפרומפט שמיישמת את ההמלצות.

כללים קריטיים:
- שמור על שפת הפרומפט המקורית (עברית נשארת עברית).
- אל תסיר חוקים קיימים שלא קשורים לבקשה — שנה רק מה שנדרש.
- אם הפרומפט מכיל דרישת פורמט JSON — שמור אותה בדיוק (שמות שדות, מבנה). שינוי שלה ישבור את המערכת.
- אם הפרומפט מכיל placeholder בצורת {{שם}} — חובה לשמר אותו כפי שהוא בגרסה המתוקנת.
- אם הבקשה מסוכנת או תשבור את הפיצ'ר — אמור זאת מפורשות ב-analysis והצע חלופה בטוחה.

החזר JSON בלבד, בדיוק במבנה:
{
  "analysis": "ניתוח קצר בעברית (2-4 משפטים)",
  "recommendations": ["המלצה 1", "המלצה 2", "..."],
  "revisedPrompt": "הפרומפט המתוקן המלא"
}`
}

export function buildAdvisorUserPrompt(
  promptTitle: string,
  currentPrompt: string,
  userRequest: string
): string {
  return `## הפיצ'ר: ${promptTitle}

## בקשת השינוי של המנהל:
${userRequest}

## הפרומפט הנוכחי:
---
${currentPrompt}
---

נתח, המלץ, וכתוב גרסה מתוקנת מלאה. החזר JSON בלבד.`
}

/**
 * Parse and validate the model's JSON response.
 * Strips accidental markdown fences. Throws on a malformed payload so the
 * caller returns an explicit error instead of showing a broken suggestion
 * (No silent AI filtering).
 */
export function parseAdvisorResponse(text: string): AdvisorResult {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  const parsed = JSON.parse(trimmed)

  if (
    typeof parsed.analysis !== 'string' ||
    !Array.isArray(parsed.recommendations) ||
    parsed.recommendations.some((r: unknown) => typeof r !== 'string') ||
    typeof parsed.revisedPrompt !== 'string' ||
    parsed.revisedPrompt.trim().length === 0
  ) {
    throw new Error('Advisor response missing required fields')
  }

  return {
    analysis: parsed.analysis,
    recommendations: parsed.recommendations,
    revisedPrompt: parsed.revisedPrompt,
  }
}

/**
 * Every {{placeholder}} present in the original prompt must survive in the
 * revised prompt — losing one breaks runtime substitution. Returns the list
 * of placeholders that were dropped (empty = safe).
 */
export function findMissingPlaceholders(originalPrompt: string, revisedPrompt: string): string[] {
  const placeholders = originalPrompt.match(/\{\{\w+\}\}/g) ?? []
  return [...new Set(placeholders)].filter((p) => !revisedPrompt.includes(p))
}
