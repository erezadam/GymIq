/**
 * Hebrew UI strings for the admin AI draft panel (ExerciseForm create mode).
 * Iron rule: no hardcoded Hebrew strings inside JSX.
 */

export const DRAFT_PANEL_STRINGS = {
  panelTitle: 'יצירת תרגיל בעזרת AI',
  nameLabel: 'שם התרגיל (עברית או אנגלית)',
  namePlaceholder: 'למשל: לחיצת חזה במכונה / Chest Press',
  generateDraft: 'צור טיוטה ב-AI',
  uploadPhoto: 'העלה צילום מכשיר',
  identifying: 'מזהה את המכשיר...',
  identifiedPrefix: 'זיהינו:',
  draftPending: 'בונה טיוטת תרגיל... זה עשוי לקחת עד דקה',
  draftReady: 'הטיוטה מולאה בטופס — עבור על השדות ואשר',
  alreadyExists: 'נראה שהתרגיל כבר קיים במערכת',
  editExisting: 'לעריכת התרגיל הקיים',
  createAnyway: 'צור בכל זאת',
  similarTitle: 'תרגילים דומים במערכת',
  openInNewTab: 'פתח בלשונית חדשה',
  imageGateTitle: 'תמונת תרגיל (התחלה/סיום)',
  generateImage: 'צור תמונה (התחלה/סיום)',
  imagePending: 'יוצר… עד 2 דקות',
  imageApproved: 'מולא',
  approveImage: 'אשר',
  regenerateImage: 'ייצר מחדש',
  errorPermission: 'אין לך הרשאה לפעולה זו',
  errorQuota: 'הגעת למכסת השימוש — נסה שוב מאוחר יותר',
  errorUnavailable: 'השירות אינו זמין כרגע — נסה שוב בעוד רגע',
  errorGeneric: 'הפעולה נכשלה — נסה שוב',
  errorNameRequired: 'הזן שם תרגיל או העלה צילום מכשיר',
  photoError: 'זיהוי המכשיר נכשל — נסה שוב',
} as const

/** Score threshold above which a photo match is treated as an existing exercise. */
export const EXISTING_MATCH_SCORE_THRESHOLD = 6

/** Max dimension (px) for the compressed machine photo upload. */
export const MACHINE_PHOTO_MAX_DIM = 1024

export const MACHINE_PHOTO_STORAGE_PATH = 'machine-photos'
