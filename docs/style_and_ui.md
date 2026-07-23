# Style & UI – GymIQ

## 1. עקרונות יסוד

| עיקרון | פירוט |
|--------|-------|
| **Mobile First** | כל עיצוב מתחיל ב-375px |
| **RTL** | כל הטקסטים בעברית, כיוון מימין לשמאל |
| **Tailwind Only** | אין CSS מותאם אישית |
| **Tokens Only** | כל צבע/גודל מ-tailwind.config.js |

---

## 2. Breakpoints

```javascript
'xs': '375px',   // iPhone SE - ברירת מחדל
'sm': '640px',   // Tablet portrait
'md': '768px',   // Tablet landscape
'lg': '1024px',  // Desktop
```

### שימוש נכון (Mobile First):
```typescript
// ✅ נכון
className="text-sm sm:text-base lg:text-lg"
className="p-3 sm:p-4 lg:p-6"
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// ❌ לא נכון (Desktop First)
className="text-lg sm:text-base xs:text-sm"
```

---

## 3. סכמת צבעים

### צבעי בסיס:
```javascript
neon: {
  dark: '#0a0a0a',      // רקע ראשי
  blue: '#00BFFF',      // הדגשה ראשית
  cyan: '#00FFFF',      // הדגשה משנית
  green: '#00FF7F',     // הצלחה/פעולה
}
```

### גווני אפור:
```javascript
'neon-gray': {
  400: '#9CA3AF',       // טקסט משני
  500: '#6B7280',       // טקסט מושתק
  600: '#4B5563',       // גבולות
  700: '#374151',       // רקע כרטיסים
  800: '#1F2937',       // רקע משני
  900: '#111827',       // רקע כהה
}
```

### צבעי סטטוס:
```javascript
status: {
  success: '#22C55E',   // הצלחה
  error: '#EF4444',     // שגיאה
  warning: '#F59E0B',   // אזהרה
}

workout: {
  completed: '#10B981', // אימון הושלם - ירוק/כחול
  inProgress: '#FFB020', // אימון בתהליך - צהוב
  planned: '#3B82F6',   // אימון מתוכנן - כחול
  aiTrainer: '#8B5CF6', // אימון AI - סגול
}
```

---

## 4. צבעי סטטוס אימון

| סטטוס | רקע | גבול | טקסט |
|-------|-----|------|------|
| `completed` | שקוף | כחול/ירוק | כחול/ירוק |
| `in_progress` | שקוף | צהוב | צהוב |
| `planned` | שקוף | אדום | אדום |

### שימוש:
```typescript
// ✅ נכון - שמות שקיימים ב-tokens
className="border-workout-completed text-workout-completed"
className="border-workout-inProgress text-workout-inProgress"
className="border-workout-planned text-workout-planned"

// ❌ לא נכון - שמות שלא קיימים
className="bg-workout-status-completed-bg"
```

---

## 4.5 עיצוב אימוני AI

אימונים שנוצרו על ידי מאמן AI מוצגים בסגנון מיוחד:

| אלמנט | סגנון |
|-------|-------|
| כותרת | "אימון AI" |
| צבע גבול | סגול (#8B5CF6) |
| צבע טקסט | סגול (#8B5CF6) |
| אייקון | 🤖 |
| רקע | שקוף עם גרדיאנט סגול עדין |

### שימוש:
```typescript
// כרטיס אימון AI יחיד
className="border-l-4 border-purple-500 bg-purple-500/10"

// כרטיס מקבץ אימוני AI
className="border-purple-500 bg-gradient-to-r from-purple-500/20 to-purple-600/10"

// תג "אימון AI"
className="text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full text-xs"
```

### כללי מקבץ:
- **אימון יחיד**: כרטיס רגיל עם עיצוב סגול
- **מקבץ (2+ אימונים)**: כרטיס אחד שנפתח לרשימת אימונים
- **אימון שהושלם**: יוצא מהמקבץ (לפי status, לא מחיקת bundleId)

---

## 5. Touch Targets

```
גודל מינימלי: 44x44px לכל אלמנט לחיץ
```

### שימוש:
```typescript
// כפתור
className="min-h-[44px] min-w-[44px] p-3"

// אייקון לחיץ
className="p-2 -m-2" // padding להגדלת אזור לחיצה
```

---

## 6. אין Hover במובייל

```typescript
// ❌ לא להסתמך על hover
className="hover:bg-blue-500"

// ✅ להשתמש ב-active
className="active:bg-blue-500"

// ✅ או שניהם
className="hover:bg-blue-500 active:bg-blue-600"
```

---

## 7. כרטיסים (Cards)

```typescript
// כרטיס בסיסי
className="bg-neon-gray-800 rounded-lg p-4 border border-neon-gray-700"

// כרטיס עם hover
className="bg-neon-gray-800 rounded-lg p-4 border border-neon-gray-700 
           active:border-neon-cyan transition-colors"
```

---

## 8. כפתורים

### כפתור ראשי:
```typescript
className="bg-neon-green text-neon-dark font-medium py-3 px-6 rounded-lg
           active:bg-neon-green/80 transition-colors min-h-[44px]"
```

### כפתור משני:
```typescript
className="bg-neon-gray-700 text-white font-medium py-3 px-6 rounded-lg
           active:bg-neon-gray-600 transition-colors min-h-[44px]"
```

### כפתור מסוכן:
```typescript
className="bg-status-error text-white font-medium py-3 px-6 rounded-lg
           active:bg-status-error/80 transition-colors min-h-[44px]"
```

---

## 9. טיפוגרפיה

| סוג | גודל | שימוש |
|-----|------|-------|
| כותרת ראשית | `text-xl font-bold` | כותרת מסך |
| כותרת משנית | `text-lg font-semibold` | כותרת סקציה |
| טקסט רגיל | `text-base` | תוכן |
| טקסט קטן | `text-sm` | תיאורים |
| טקסט זעיר | `text-xs` | מטא-דאטה |

---

## 10. איסורים

❌ לא להשתמש בצבעים inline:
```typescript
style={{ backgroundColor: '#00f5ff' }}
```

❌ לא להשתמש בערכים שרירותיים:
```typescript
className="bg-[#00f5ff]"
className="p-[17px]"
```

❌ לא ליצור קבצי CSS חדשים

❌ לא להשתמש ב-class שלא קיים ב-tokens

---

## 11. קומפוננטת MuscleIcon

קומפוננטה להצגת אייקון שריר - תמונה מ-URL או אימוג'י כ-fallback.

### שימוש:
```typescript
import { MuscleIcon } from '@/shared/components/MuscleIcon'

// בסיסי
<MuscleIcon icon={muscle.icon} />

// עם גודל מותאם
<MuscleIcon icon={muscle.icon} size={24} />
<MuscleIcon icon={muscle.icon} size={32} />
<MuscleIcon icon={muscle.icon} size={48} />
<MuscleIcon icon={muscle.icon} size={64} />
```

### Props:
| Prop | Type | Default | תיאור |
|------|------|---------|-------|
| `icon` | string | required | URL לתמונה או אימוג'י |
| `size` | number | 48 | גודל בפיקסלים |
| `className` | string | '' | classes נוספים |

### התנהגות:
- אם `icon` הוא URL (מתחיל ב-http/https) → מציג תמונה
- אם `icon` הוא אימוג'י או טקסט → מציג כטקסט
- אם התמונה לא נטענת → מציג 💪 כ-fallback

---

---

## ספריית פרומפטים (אדמין) — מבנה כרטיס (23/07/2026)

כרטיס פרומפט ב-`/admin/prompts` מחולק לשלושה אזורים, בסדר קבוע:

1. **"בשליטתך — נשמר ומשפיע"** (כותרת `text-primary` + אייקון Pencil) — בורר מודל (`<select>` קשיח, `dir="ltr"`), מקסימום טוקנים, ו-textarea של הפרומפט. אזהרות עורך (למשל טווח המשקל) ב-pattern הענבר הקיים: `bg-amber-500/10 border-amber-500/30 text-amber-300`.
2. **"נעול בקוד — לא נערך כאן (הבטחות)"** (כותרת `text-on-surface-variant` + אייקון Lock) — רשימת `codeEnforcedHe` מהרגיסטרי, קריאה בלבד.
3. **"מוזרק אוטומטית בזמן ריצה"** — `bg-neon-gray-800`, רשימת `runtimeContextHe` + נתיב קובץ המקור.

עורך מסך מלא: overlay ‏`fixed inset-0 z-50 bg-dark-bg`, כפתור X ‏`w-11 h-11` (חוק המודאלים), ‏Escape סוגר, footer עם שמירה. ה-state משותף לכרטיס.

```
═══════════════════════════════════════════════════════════════════════════════
עדכון אחרון: 09/01/2026
גרסה: 1.9
═══════════════════════════════════════════════════════════════════════════════
```
