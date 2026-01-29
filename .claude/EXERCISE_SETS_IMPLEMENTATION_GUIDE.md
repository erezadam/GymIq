# פרויקט: סטים מומלצים (Exercise Sets)
# הנחיות לסוכן - גרסה מלאה

---

## 🎯 מטרת הפרויקט

יצירת יכולת לאדמינים להגדיר סטים מוכנים של תרגילים, ולמשתמשים לבחור סט שלם במהירות במקום לבחור תרגילים אחד-אחד.

---

## 📋 תנאי פתיחה לכל שלב

```
קרא את קובץ CLAUDE.md בתיקיית הפרויקט והצהר שקראת אותו לפני שתתחיל לעבוד
```

---

## 🚨 כללי ברזל

1. **לא לשנות חתימות פונקציות קיימות** - רק להוסיף
2. **להשתמש ב-tokens.ts** - לא hardcoded colors/spacing
3. **לבדוק רגרסיות** - אחרי כל שינוי בקובץ קיים
4. **לבדוק מובייל** - 375px אחרי כל שינוי UI
5. **RTL** - כל הטקסטים בעברית, direction: rtl
6. **Deploy אחד בסוף** - לא deploy אחרי כל שלב!

---

## 📝 תבנית פתיחה (לכל שלב)

```
🎯 Goal: [משפט אחד - מה המטרה]
🏁 Done: [איך יודעים שסיימנו - קריטריון ברור]
📁 Files: [רשימת קבצים ליצירה/עדכון]
⚠️ Dependencies: [מה יושפע מהשינוי - קבצים/פונקציות אחרות]
```

---

## 📝 תבנית סיום (לכל שלב)

```
📋 Summary:
- Changed: [מה השתנה - קבצים ושורות]
- Tested: [מה נבדק - רשימת בדיקות שעברו]
- Next: [השלב הבא]

🔐 Security: [בדיקת rules אם רלוונטי / N/A]
```

---

## 🧪 תהליך בדיקות

### אחרי כל שינוי:
```bash
npm run dev
```
- [ ] בדיקה מקומית בדפדפן
- [ ] בדיקה ב-375px (mobile)
- [ ] RTL תקין

### אחרי שלב 1 (תשתית):
- [ ] Firebase Emulator לבדיקת rules
- [ ] CRUD עובד מהקונסול

### לפני Deploy (רק אחרי שלב 6!):
```bash
npm run build  # חייב לעבור בלי errors
```
- [ ] בדיקת רגרסיה מלאה מקומית
- [ ] E2E מלא עובר מקומית
- [ ] Deploy אחד בלבד
- [ ] בדיקה על Production

### ❌ מה לא לעשות:
- לא לעשות deploy אחרי כל שלב
- לא להסתמך על "זה אמור לעבוד"
- לא לדלג על בדיקות כי "השינוי קטן"

---

# שלב 0: שינוי UI שורת הבחירה (Toggle Row)

## 📝 תבנית פתיחה
```
🎯 Goal: לשנות את שורת בחירת המצב ל-3 כפתורים בשורה אחת (עכשיו/להיום/תאריך)
🏁 Done: 3 כפתורים מוצגים בשורה, כל אחד עובד, Mobile 375px תקין
📁 Files: 
   - עדכון: src/domains/exercises/components/ExerciseLibrary.tsx
⚠️ Dependencies: 
   - workoutBuilderStore (לוגיקת המצב)
   - לא לשנות את הלוגיקה - רק את ה-UI
```

## 📖 Skills לקרוא לפני התחלה
```
קרא: .claude/mobile-rtl-SKILL.md
קרא: .claude/development-flow-SKILL.md
```

## 🎯 מטרה
לשנות את שורת בחירת המצב (התחל עכשיו / תכנן להיום / בחר תאריך) לשורה אחת קומפקטית.

## 📍 קובץ לשינוי
```
src/domains/exercises/components/ExerciseLibrary.tsx
```

## 🎨 עיצוב נדרש

**מצב נוכחי (לפי הסקרינשוט):**
```
┌─────────────────────────────────────────────────────┐
│  📅 בחר תאריך לאימון: 27 בינו' 2026                 │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  [◉ התחל עכשיו]         [○ תכנן להיום]             │
└─────────────────────────────────────────────────────┘
```

**מצב חדש:**
```
┌─────────────────────────────────────────────────────┐
│  [◉ עכשיו]    [○ להיום]    [○ 📅 תאריך]            │
└─────────────────────────────────────────────────────┘
```

## 📐 מפרט עיצוב

### Container
```typescript
{
  display: 'flex',
  gap: '8px',
  background: tokens.colors.bgCard,  // #0d1f35
  borderRadius: '14px',
  padding: '6px',
  border: `1px solid ${tokens.colors.borderLight}`,  // rgba(255,255,255,0.1)
}
```

### כפתורים - 3 כפתורים שווים
```typescript
// כל כפתור
{
  flex: 1,
  padding: '12px 4px',
  borderRadius: '10px',
  border: 'none',
  fontSize: '13px',
  fontWeight: '600',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
}

// Radio circle
{
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  border: '2px solid [color]',
}
```

### צבעים לפי מצב

| מצב | צבע רקע (selected) | צבע טקסט | צבע Radio |
|-----|-------------------|----------|-----------|
| **עכשיו** | rgba(0,191,165,0.1) | #00bfa5 (primary) | #00bfa5 |
| **להיום** | rgba(249,115,22,0.1) | #f97316 (secondary) | #f97316 |
| **📅 תאריך** | rgba(167,139,250,0.1) | #a78bfa | #a78bfa |

### התנהגות
1. **"עכשיו"** - ברירת מחדל, לא מציג תאריך
2. **"להיום"** - שומר אימון מתוכנן להיום
3. **"📅 תאריך"** - לחיצה פותחת date picker
   - אחרי בחירת תאריך: מציג את התאריך שנבחר במקום "📅 תאריך"
   - לדוגמה: "28 בינו'"

### כפתור תחתון משתנה

| מצב | טקסט כפתור |
|-----|------------|
| עכשיו | "התחל אימון (X)" |
| להיום | "שמור להיום (X)" |
| תאריך | "שמור אימון (X)" |

## ✅ בדיקות לפני סיום שלב 0

```markdown
## בדיקות שלב 0 - Toggle Row

### פונקציונליות
- [ ] לחיצה על "עכשיו" בוחרת את המצב
- [ ] לחיצה על "להיום" בוחרת את המצב
- [ ] לחיצה על "📅 תאריך" פותחת date picker
- [ ] אחרי בחירת תאריך - מוצג בכפתור
- [ ] כפתור תחתון משתנה לפי המצב

### UI
- [ ] 3 כפתורים באותו רוחב
- [ ] Radio button מוצג נכון (ריק/מלא)
- [ ] צבעים נכונים לפי מצב
- [ ] Mobile 375px - לא נחתך/גולש

### רגרסיה
- [ ] בחירת תרגילים עדיין עובדת
- [ ] התחלת אימון עדיין עובדת
- [ ] שמירת אימון מתוכנן עדיין עובדת
```

## 🔴 מה לא לגעת
- לוגיקת בחירת תרגילים
- לוגיקת התחלת אימון
- פילטרים קיימים

## 📝 תבנית סיום (למלא אחרי ביצוע)
```
📋 Summary:
- Changed: [קבצים ששונו]
- Tested: [בדיקות שעברו מהרשימה למעלה]
- Next: שלב 1 - תשתית Firebase

🔐 Security: N/A (שינוי UI בלבד)
```

---

# שלב 1: תשתית Firebase

## 📝 תבנית פתיחה
```
🎯 Goal: יצירת תשתית הנתונים לסטים - Types, Firebase Service, Storage Service, Security Rules
🏁 Done: CRUD עובד, Rules מאפשרים read לכולם ו-write רק לאדמין, העלאת תמונה עובדת
📁 Files: 
   - חדש: src/domains/exercises/types/exerciseSet.types.ts
   - חדש: src/lib/firebase/exerciseSets.ts
   - חדש: src/lib/firebase/exerciseSetStorage.ts
   - עדכון: firestore.rules
   - עדכון: storage.rules
⚠️ Dependencies: 
   - ExerciseCategory מ-types קיים
   - Firebase config קיים
   - isAdmin() function קיימת ב-rules
```

## 📖 Skills לקרוא לפני התחלה
```
קרא: .claude/firebase-data-SKILL.md
קרא: .claude/development-flow-SKILL.md
```

## 🎯 מטרה
יצירת תשתית הנתונים לסטים: Types, Firebase Service, Storage Service, Security Rules.

## 📁 קבצים חדשים ליצירה

### 1. Types - `src/domains/exercises/types/exerciseSet.types.ts`

```typescript
import { Timestamp } from 'firebase/firestore';
import { ExerciseCategory } from './exercise.types'; // וודא שזה הנתיב הנכון

export type ExerciseSetDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ExerciseSet {
  id: string;
  name: string;                    // שם בעברית (ראשי)
  nameEn?: string;                 // שם באנגלית (אופציונלי)
  muscleGroup: ExerciseCategory;   // שימוש בטייפ הקיים!
  exerciseIds: string[];           // מזהי תרגילים מ-exercises collection
  setImage: string;                // URL מ-Firebase Storage
  description?: string;
  difficulty: ExerciseSetDifficulty;
  order: number;                   // סדר הצגה בתוך קבוצת השריר
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;               // UID של האדמין שיצר
}

export interface ExerciseSetFormData {
  name: string;
  nameEn?: string;
  muscleGroup: ExerciseCategory;
  exerciseIds: string[];
  setImage: string;
  description?: string;
  difficulty: ExerciseSetDifficulty;
  isActive: boolean;
}

export const DIFFICULTY_LABELS: Record<ExerciseSetDifficulty, string> = {
  beginner: 'מתחילים',
  intermediate: 'בינוני',
  advanced: 'מתקדמים',
};

export const DIFFICULTY_COLORS: Record<ExerciseSetDifficulty, string> = {
  beginner: '#4ade80',
  intermediate: '#fbbf24',
  advanced: '#f97316',
};
```

### 2. Firebase Service - `src/lib/firebase/exerciseSets.ts`

```typescript
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { ExerciseSet, ExerciseSetFormData } from '@/domains/exercises/types/exerciseSet.types';

const COLLECTION_NAME = 'exerciseSets';

// קבלת כל הסטים הפעילים
export const getActiveSets = async (muscleGroup?: string): Promise<ExerciseSet[]> => {
  let q = query(
    collection(db, COLLECTION_NAME),
    where('isActive', '==', true),
    orderBy('muscleGroup'),
    orderBy('order', 'asc')
  );

  const snapshot = await getDocs(q);
  const sets = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ExerciseSet[];

  // סינון לפי muscleGroup בצד הלקוח (פשוט יותר מ-compound query)
  if (muscleGroup && muscleGroup !== 'all') {
    return sets.filter(set => set.muscleGroup === muscleGroup);
  }

  return sets;
};

// קבלת כל הסטים (לאדמין)
export const getAllSets = async (): Promise<ExerciseSet[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('muscleGroup'),
    orderBy('order', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ExerciseSet[];
};

// קבלת סט בודד
export const getSetById = async (setId: string): Promise<ExerciseSet | null> => {
  const docRef = doc(db, COLLECTION_NAME, setId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  
  return {
    id: snapshot.id,
    ...snapshot.data()
  } as ExerciseSet;
};

// יצירת סט חדש
export const createSet = async (
  data: ExerciseSetFormData,
  userId: string
): Promise<string> => {
  // חישוב order - מקסימום +1 בקבוצת השריר
  const existingSets = await getActiveSets(data.muscleGroup);
  const maxOrder = existingSets.reduce((max, set) => Math.max(max, set.order), 0);

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    order: maxOrder + 1,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: userId,
  });

  return docRef.id;
};

// עדכון סט
export const updateSet = async (
  setId: string,
  data: Partial<ExerciseSetFormData>
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, setId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

// מחיקת סט (soft delete)
export const deleteSet = async (setId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, setId);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: Timestamp.now(),
  });
};

// מחיקה קשה (לאדמין)
export const hardDeleteSet = async (setId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, setId);
  await deleteDoc(docRef);
};

// עדכון סדר סטים (אחרי drag & drop)
export const updateSetsOrder = async (
  updates: Array<{ id: string; order: number }>
): Promise<void> => {
  const batch = writeBatch(db);
  
  updates.forEach(({ id, order }) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    batch.update(docRef, { 
      order,
      updatedAt: Timestamp.now()
    });
  });

  await batch.commit();
};

// Toggle isActive
export const toggleSetActive = async (
  setId: string,
  isActive: boolean
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, setId);
  await updateDoc(docRef, {
    isActive,
    updatedAt: Timestamp.now(),
  });
};
```

### 3. Storage Service - `src/lib/firebase/exerciseSetStorage.ts`

```typescript
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from './config';

const STORAGE_FOLDER = 'exercise-sets';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

// וולידציה של קובץ תמונה
export const validateImageFile = (file: File): ImageValidationResult => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'סוג קובץ לא נתמך. יש להעלות JPG, PNG או WebP',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'הקובץ גדול מדי. גודל מקסימלי: 2MB',
    };
  }

  return { valid: true };
};

// העלאת תמונה
export const uploadExerciseSetImage = async (
  file: File,
  setId: string
): Promise<string> => {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `${setId}_${timestamp}.${extension}`;
  const storageRef = ref(storage, `${STORAGE_FOLDER}/${fileName}`);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
};

// מחיקת תמונה
export const deleteExerciseSetImage = async (imageUrl: string): Promise<void> => {
  try {
    // חילוץ הpath מה-URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/exercise-sets%2F([^?]+)/);
    
    if (pathMatch) {
      const fileName = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(storage, `${STORAGE_FOLDER}/${fileName}`);
      await deleteObject(storageRef);
    }
  } catch (error) {
    // אם התמונה לא קיימת, לא לזרוק שגיאה
    console.warn('Failed to delete image:', error);
  }
};

// החלפת תמונה (מחיקה + העלאה)
export const replaceExerciseSetImage = async (
  file: File,
  setId: string,
  oldImageUrl?: string
): Promise<string> => {
  // מחיקת התמונה הישנה אם קיימת
  if (oldImageUrl) {
    await deleteExerciseSetImage(oldImageUrl);
  }

  // העלאת התמונה החדשה
  return uploadExerciseSetImage(file, setId);
};
```

### 4. Security Rules - הוספה ל-`firestore.rules`

```javascript
// ============ EXERCISE SETS ============
// מיקום: לפני הסגירה האחרונה של match /databases/{database}/documents

match /exerciseSets/{setId} {
  // כולם יכולים לקרוא
  allow read: if true;
  
  // רק אדמין יכול לכתוב
  allow create, update, delete: if isAdmin();
}
```

### 5. Storage Rules - הוספה ל-`storage.rules`

```javascript
// ============ EXERCISE SET IMAGES ============
match /exercise-sets/{imageId} {
  allow read: if true;
  allow write: if request.auth != null && isAdmin();
}
```

### 6. Firestore Index

יצירת אינדקס (אם נדרש - Firestore יודיע בשגיאה):
```
Collection: exerciseSets
Fields: muscleGroup ASC, order ASC
```

## ✅ בדיקות לפני סיום שלב 1

```markdown
## בדיקות שלב 1 - תשתית

### Types
- [ ] אין שגיאות TypeScript
- [ ] ExerciseCategory מיובא נכון

### Firebase Service
- [ ] getActiveSets מחזיר מערך ריק (אין נתונים עדיין)
- [ ] getAllSets מחזיר מערך ריק
- [ ] createSet יוצר document ב-Firestore
- [ ] updateSet מעדכן document
- [ ] toggleSetActive עובד

### Storage Service
- [ ] validateImageFile מזהה קבצים לא תקינים
- [ ] validateImageFile מאשר קבצים תקינים

### Security Rules
- [ ] Deploy של rules עבר בהצלחה
- [ ] משתמש רגיל יכול לקרוא exerciseSets
- [ ] משתמש רגיל לא יכול לכתוב exerciseSets
- [ ] אדמין יכול לקרוא ולכתוב

### רגרסיה
- [ ] האפליקציה עולה בלי שגיאות
- [ ] פונקציונליות קיימת לא נפגעה
```

## 📝 תבנית סיום (למלא אחרי ביצוע)
```
📋 Summary:
- Changed: [קבצים ששונו]
- Tested: [בדיקות שעברו מהרשימה למעלה]
- Next: שלב 2 - אדמין פאנל רשימה

🔐 Security: 
- [ ] Rules deployed בהצלחה
- [ ] משתמש רגיל לא יכול לכתוב (בדיקה ב-Emulator)
```

---

# שלב 2: אדמין פאנל - רשימה עם Drag & Drop

## 📝 תבנית פתיחה
```
🎯 Goal: יצירת עמוד ניהול סטים באדמין עם רשימה ו-Drag & Drop לשינוי סדר
🏁 Done: עמוד /admin/sets נטען, מציג סטים, Drag & Drop משנה סדר ושומר
📁 Files: 
   - חדש: src/pages/admin/ExerciseSetsPage.tsx
   - חדש: src/domains/admin/components/ExerciseSetManager.tsx
   - עדכון: src/App.tsx (route)
   - עדכון: AdminLayout או תפריט אדמין
⚠️ Dependencies: 
   - exerciseSets service משלב 1
   - @dnd-kit/core (לבדוק אם מותקן, אם לא - להתקין)
   - Pattern של BandTypeManager.tsx
```

## 📖 Skills לקרוא לפני התחלה
```
קרא: .claude/development-flow-SKILL.md
קרא: .claude/mobile-rtl-SKILL.md
```

## 🎯 מטרה
יצירת עמוד ניהול סטים באדמין עם יכולת Drag & Drop לשינוי סדר.

## 📍 קבצים לעדכון

### 1. הוספת Route - `src/App.tsx`

מצא את הroutes של אדמין והוסף:
```typescript
// בתוך routes של אדמין
{
  path: 'sets',
  element: <ExerciseSetsPage />,
}
```

### 2. הוספה לתפריט - `src/domains/admin/components/AdminLayout.tsx` (או שם דומה)

מצא את תפריט האדמין והוסף:
```typescript
// בתוך navigation items
{
  path: '/admin/sets',
  label: 'ניהול סטים',
  icon: '🎯', // או אייקון מתאים
}
```

## 📁 קבצים חדשים ליצירה

### 1. עמוד - `src/pages/admin/ExerciseSetsPage.tsx`

```typescript
import { ExerciseSetManager } from '@/domains/admin/components/ExerciseSetManager';

export default function ExerciseSetsPage() {
  return <ExerciseSetManager />;
}
```

### 2. קומפוננטה ראשית - `src/domains/admin/components/ExerciseSetManager.tsx`

**עקוב אחרי Pattern של:** `BandTypeManager.tsx` או קומפוננטת ניהול דומה קיימת.

**יכולות:**
- טעינת כל הסטים (getAllSets)
- הצגה בטבלה/רשימה
- פילטר לפי קבוצת שריר
- פילטר "פעילים בלבד"
- Toggle ל-isActive
- Drag & Drop לשינוי סדר
- כפתור "+ הוסף סט"
- לחיצה על שורה = פתיחת טופס עריכה

**מבנה UI:**

```
┌─────────────────────────────────────────────────────┐
│  ניהול סטים                        [+ הוסף סט]     │
├─────────────────────────────────────────────────────┤
│  קבוצת שריר: [הכל ▼]    [☑ פעילים בלבד]            │
├─────────────────────────────────────────────────────┤
│  ☰ │ [img] │ כתפיים בסיסי │ כתפיים │ 4 │ ✓ │ ✏️ 🗑️ │
│  ☰ │ [img] │ כתפיים מתקדם │ כתפיים │ 5 │ ✓ │ ✏️ 🗑️ │
│  ☰ │ [img] │ חזה בסיסי    │ חזה    │ 4 │ ✓ │ ✏️ 🗑️ │
└─────────────────────────────────────────────────────┘
```

**Drag & Drop:**
- השתמש ב-`@dnd-kit/core` ו-`@dnd-kit/sortable` (אם כבר מותקן)
- אם לא מותקן: `npm install @dnd-kit/core @dnd-kit/sortable`
- אחרי שחרור: קריאה ל-`updateSetsOrder`

## ✅ בדיקות לפני סיום שלב 2

```markdown
## בדיקות שלב 2 - אדמין רשימה

### ניווט
- [ ] Route /admin/sets נטען
- [ ] מופיע בתפריט האדמין
- [ ] ניתן לנווט מהתפריט

### תצוגה
- [ ] מציג "אין סטים" כשאין נתונים
- [ ] טבלה/רשימה מוצגת כשיש נתונים
- [ ] תמונות נטענות

### פילטרים
- [ ] פילטר קבוצת שריר עובד
- [ ] פילטר "פעילים בלבד" עובד

### פעולות
- [ ] Toggle isActive עובד
- [ ] Drag & Drop משנה סדר
- [ ] סדר נשמר ל-Firestore אחרי drop
- [ ] כפתור "+ הוסף סט" פותח טופס (ריק בשלב זה)

### רגרסיה
- [ ] ניהול תרגילים עדיין עובד
- [ ] ניהול ציוד עדיין עובד
```

## 📝 תבנית סיום (למלא אחרי ביצוע)
```
📋 Summary:
- Changed: [קבצים ששונו]
- Tested: [בדיקות שעברו מהרשימה למעלה]
- Next: שלב 3 - טופס אדמין

🔐 Security: N/A (משתמש ב-rules משלב 1)
```

---

# שלב 3: אדמין פאנל - טופס יצירה/עריכה

## 📝 תבנית פתיחה
```
🎯 Goal: יצירת טופס ליצירה ועריכה של סטים, כולל העלאת תמונה ובחירת תרגילים
🏁 Done: יצירת סט חדש עובדת, עריכה עובדת, תמונה עולה ל-Storage
📁 Files: 
   - חדש: src/domains/admin/components/ExerciseSetForm.tsx
   - חדש: src/domains/admin/components/ExerciseSetExercisePicker.tsx
   - חדש: src/domains/admin/components/ExerciseSetImageUpload.tsx
⚠️ Dependencies: 
   - exerciseSetStorage service משלב 1
   - react-hook-form + zod (לבדוק Pattern ב-ExerciseForm.tsx)
   - exercises collection לבחירת תרגילים
```

## 📖 Skills לקרוא לפני התחלה
```
קרא: .claude/development-flow-SKILL.md
```

## 🎯 מטרה
יצירת טופס ליצירה ועריכה של סטים, כולל העלאת תמונה ובחירת תרגילים.

## 📁 קבצים חדשים ליצירה

### 1. טופס ראשי - `src/domains/admin/components/ExerciseSetForm.tsx`

**עקוב אחרי Pattern של:** `ExerciseForm.tsx` (react-hook-form + zod)

**Validation Schema:**
```typescript
import { z } from 'zod';

export const exerciseSetSchema = z.object({
  name: z.string().min(2, 'שם חובה - מינימום 2 תווים'),
  nameEn: z.string().optional(),
  muscleGroup: z.enum([
    'chest', 'back', 'legs', 'shoulders', 'arms', 
    'core', 'cardio', 'functional', 'stretching', 'warmup'
  ], { required_error: 'יש לבחור קבוצת שריר' }),
  exerciseIds: z.array(z.string()).min(2, 'יש לבחור לפחות 2 תרגילים'),
  setImage: z.string().min(1, 'יש להעלות תמונה'),
  description: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: 'יש לבחור רמת קושי'
  }),
  isActive: z.boolean().default(true),
});
```

**מבנה UI:**
```
┌─────────────────────────────────────────────────────┐
│  יצירת סט חדש                              [X]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  שם הסט *                                          │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  קבוצת שריר *                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │                                           [▼] │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  רמת קושי *                                        │
│  [◉ מתחילים]  [○ בינוני]  [○ מתקדמים]              │
│                                                     │
│  תיאור (אופציונלי)                                 │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  תמונת סט * (ראה ExerciseSetImageUpload)           │
│                                                     │
│  בחירת תרגילים * (ראה ExerciseSetExercisePicker)   │
│                                                     │
│  [☑ פעיל]                                          │
│                                                     │
│  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │   ביטול     │  │         שמור סט             │  │
│  └─────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 2. העלאת תמונה - `src/domains/admin/components/ExerciseSetImageUpload.tsx`

**יכולות:**
- Drag & Drop zone
- לחיצה לבחירת קובץ
- וולידציה: max 2MB, jpg/png/webp
- Preview של התמונה
- כפתור החלפה/מחיקה
- Loading state בזמן העלאה

**מבנה UI:**
```
// מצב ריק
┌───────────────────────────────────────────────────┐
│                                                   │
│         📷 גרור תמונה לכאן או לחץ לבחירה         │
│         JPG, PNG, WebP • עד 2MB                   │
│                                                   │
└───────────────────────────────────────────────────┘

// מצב עם תמונה
┌───────────────────────────────────────────────────┐
│  [=============== תמונה ===============]          │
│                                                   │
│  ┌──────────┐  ┌──────────┐                      │
│  │  החלף    │  │   מחק    │                      │
│  └──────────┘  └──────────┘                      │
└───────────────────────────────────────────────────┘
```

### 3. בחירת תרגילים - `src/domains/admin/components/ExerciseSetExercisePicker.tsx`

**יכולות:**
- חיפוש תרגילים
- פילטר לפי קבוצת שריר
- הצגת תרגילים זמינים
- הצגת תרגילים נבחרים
- Drag & Drop לשינוי סדר התרגילים בסט
- הוספה/הסרה של תרגילים

**מבנה UI:**
```
┌───────────────────────────────────────────────────┐
│ 🔍 חפש תרגיל...                                  │
├───────────────────────────────────────────────────┤
│ תרגילים נבחרים (4):                              │
│ ┌─────────────────────────────────────────────┐   │
│ │ ☰ [img] לחיצת כתפיים                  [X]  │   │
│ │ ☰ [img] הרמה צידית                    [X]  │   │
│ │ ☰ [img] הרמה קדמית                    [X]  │   │
│ │ ☰ [img] פרפר הפוך                     [X]  │   │
│ └─────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────┤
│ תרגילים זמינים:  [כתפיים ▼]                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ [img] ארנולד פרס                  [+ הוסף]  │   │
│ │ [img] שרגס                        [+ הוסף]  │   │
│ │ [img] פייס פול                    [+ הוסף]  │   │
│ └─────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘
```

## ✅ בדיקות לפני סיום שלב 3

```markdown
## בדיקות שלב 3 - טופס אדמין

### טופס בסיסי
- [ ] טופס נפתח ללחיצה על "+ הוסף סט"
- [ ] טופס נפתח ללחיצה על שורה קיימת (מצב עריכה)
- [ ] כל השדות מוצגים
- [ ] Validation עובד (שדות חובה)
- [ ] הודעות שגיאה מוצגות בעברית

### העלאת תמונה
- [ ] Drag & Drop עובד
- [ ] לחיצה לבחירת קובץ עובדת
- [ ] וולידציה מזהה קובץ גדול מדי
- [ ] וולידציה מזהה סוג קובץ לא נתמך
- [ ] Preview מוצג אחרי בחירה
- [ ] תמונה עולה ל-Storage
- [ ] URL נשמר בטופס
- [ ] החלפת תמונה מוחקת את הישנה

### בחירת תרגילים
- [ ] חיפוש עובד
- [ ] פילטר קבוצת שריר עובד
- [ ] הוספת תרגיל עובדת
- [ ] הסרת תרגיל עובדת
- [ ] Drag & Drop לשינוי סדר עובד
- [ ] מינימום 2 תרגילים נאכף

### שמירה
- [ ] יצירת סט חדש נשמרת ל-Firestore
- [ ] עריכת סט קיים נשמרת ל-Firestore
- [ ] חזרה לרשימה אחרי שמירה
- [ ] הסט החדש מופיע ברשימה

### רגרסיה
- [ ] ניהול תרגילים עדיין עובד
- [ ] ניהול ציוד עדיין עובד
```

## 📝 תבנית סיום (למלא אחרי ביצוע)
```
📋 Summary:
- Changed: [קבצים ששונו]
- Tested: [בדיקות שעברו מהרשימה למעלה]
- Next: שלב 4 - הרחבת Store

🔐 Security: 
- [ ] תמונות עולות רק לאדמין
- [ ] URL של תמונה נשמר נכון ב-Firestore
```

---

# שלב 4: הרחבת Store

## 📝 תבנית פתיחה
```
🎯 Goal: הוספת Action חדש ל-workoutBuilderStore שמאפשר להוסיף מספר תרגילים בבת אחת
🏁 Done: addExercisesFromSet עובד, תרגילים כפולים לא נוספים, addExercise הקיים עדיין עובד
📁 Files: 
   - עדכון: src/domains/workouts/store/workoutBuilderStore.ts
⚠️ Dependencies: 
   - SelectedExercise interface קיים
   - לא לשנות addExercise, removeExercise, selectedExercises
```

## 📖 Skills לקרוא לפני התחלה
```
קרא: .claude/development-flow-SKILL.md
```

## 🎯 מטרה
הוספת Action חדש ל-workoutBuilderStore שמאפשר להוסיף מספר תרגילים בבת אחת מסט.

## 📍 קובץ לעדכון
```
src/domains/workouts/store/workoutBuilderStore.ts
```

## 🔧 שינויים נדרשים

### 1. הוספת Interface (אם לא קיים)

```typescript
interface ExerciseToAdd {
  exerciseId: string;
  exerciseName: string;
  exerciseNameHe: string;
  imageUrl: string;
  primaryMuscle: string;
  category?: string;
  equipment?: string;
  reportType?: string;
  assistanceTypes?: AssistanceType[];
  availableBands?: string[];
}
```

### 2. הוספת Action

```typescript
// בתוך interface WorkoutBuilderState
addExercisesFromSet: (exercises: ExerciseToAdd[]) => void;

// בתוך create((set, get) => ({
addExercisesFromSet: (exercises) => {
  set((state) => {
    const currentExercises = state.selectedExercises;
    const currentIds = new Set(currentExercises.map(e => e.exerciseId));
    
    // סנן תרגילים שכבר קיימים
    const newExercises = exercises.filter(ex => !currentIds.has(ex.exerciseId));
    
    if (newExercises.length === 0) return state;
    
    // חשב את ה-order הבא
    const maxOrder = currentExercises.reduce(
      (max, ex) => Math.max(max, ex.order || 0),
      0
    );
    
    // צור אובייקטים מלאים עם ברירות מחדל
    const exercisesToAdd = newExercises.map((exercise, index) => ({
      ...exercise,
      sets: state.defaultSets || 3,
      restTime: state.defaultRestTime || 90,
      order: maxOrder + index + 1,
      // שדות נוספים לפי הקיים ב-addExercise
    }));
    
    return {
      selectedExercises: [...currentExercises, ...exercisesToAdd],
    };
  });
},
```

## ⚠️ זהירות

**לא לשנות:**
- `addExercise` - ה-action הקיים להוספת תרגיל בודד
- `removeExercise` - ה-action הקיים להסרת תרגיל
- `selectedExercises` - מבנה הנתונים הקיים

## ✅ בדיקות לפני סיום שלב 4

```markdown
## בדיקות שלב 4 - Store

### Action חדש
- [ ] addExercisesFromSet מוסיף תרגילים לרשימה
- [ ] תרגילים כפולים לא נוספים
- [ ] Order מחושב נכון
- [ ] ברירות מחדל (sets, restTime) מוגדרות

### רגרסיה - קריטי!
- [ ] addExercise עדיין עובד
- [ ] removeExercise עדיין עובד
- [ ] clearExercises עדיין עובד
- [ ] reorderExercises עדיין עובד
- [ ] בחירת תרגיל בודד במסך עדיין עובדת
- [ ] התחלת אימון עדיין עובדת
- [ ] אימון שלם (בחירה → ביצוע → שמירה) עדיין עובד
```

## 📝 תבנית סיום (למלא אחרי ביצוע)
```
📋 Summary:
- Changed: [קבצים ששונו]
- Tested: [בדיקות שעברו מהרשימה למעלה]
- Next: שלב 5 - UI משתמש

🔐 Security: N/A (שינוי store בלבד)
```

---

# שלב 5: ממשק משתמש - RecommendedSets

## 📝 תבנית פתיחה
```
🎯 Goal: הוספת סקשן "סטים מומלצים" למסך בחירת תרגילים עם Grid אופקי ו-Popup
🏁 Done: סקשן מוצג, לחיצה פותחת Popup עם תמונה גדולה, "בחר סט" מוסיף תרגילים
📁 Files: 
   - חדש: src/domains/exercises/components/RecommendedSets.tsx
   - חדש: src/domains/exercises/components/ExerciseSetCard.tsx
   - חדש: src/domains/exercises/components/ExerciseSetModal.tsx
   - עדכון: src/domains/exercises/components/ExerciseLibrary.tsx
⚠️ Dependencies: 
   - addExercisesFromSet משלב 4
   - getActiveSets משלב 1
   - ❌ לא לגעת ב: handleToggleExercise, selectedExercises, filteredExercises
```

## 📖 Skills לקרוא לפני התחלה
```
קרא: .claude/mobile-rtl-SKILL.md
קרא: .claude/development-flow-SKILL.md
קרא: .claude/qa-testing-SKILL.md
```

## 🎯 מטרה
הוספת סקשן "סטים מומלצים" למסך בחירת תרגילים.

## ⚠️ שלב קריטי - סיכון גבוה

**זה השלב הכי רגיש בפרויקט!**
- נוגע בקובץ קריטי: ExerciseLibrary.tsx
- יכול לשבור בחירת תרגילים קיימת

## 📍 קבצים

### 1. קובץ קריטי לעדכון
```
src/domains/exercises/components/ExerciseLibrary.tsx
```

### 2. קבצים חדשים
```
src/domains/exercises/components/RecommendedSets.tsx
src/domains/exercises/components/ExerciseSetCard.tsx
src/domains/exercises/components/ExerciseSetModal.tsx
```

## 🎨 עיצוב - Grid אופקי עם Popup

### מבנה ברשימה (Expanded)

```
┌─────────────────────────────────────────────────────┐
│  🎯 סטים מומלצים              (3)              [▲] │
├─────────────────────────────────────────────────────┤
│  [כתפיים ▼]                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│   │ [thumb]  │  │ [thumb]  │  │ [thumb]  │   →     │
│   │ סט 1     │  │ סט 2     │  │ סט 3     │         │
│   │ מתחילים │  │ מתקדמים │  │ בינוני  │         │
│   └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│   ← גלילה אופקית →                                 │
└─────────────────────────────────────────────────────┘
```

### Popup (אחרי לחיצה על כרטיס)

```
┌─────────────────────────────────────────┐
│  כתפיים בסיסי                     [X]  │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │                                   │  │
│  │        תמונת הסט הגדולה          │  │
│  │      (רואים את כל התרגילים)      │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  4 תרגילים • מתחילים                   │
│  סט מאוזן לפיתוח כתפיים עגולות         │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │           בחר סט                │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## 📁 קבצים חדשים

### 1. כרטיס סט (Thumbnail) - `src/domains/exercises/components/ExerciseSetCard.tsx`

```typescript
import React from 'react';
import { ExerciseSet, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../types/exerciseSet.types';
import { tokens } from '@/styles/tokens';

interface ExerciseSetCardProps {
  set: ExerciseSet;
  onClick: () => void;  // פותח popup, לא בוחר
}

export const ExerciseSetCard: React.FC<ExerciseSetCardProps> = ({
  set,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      style={{
        // Thumbnail size
        width: '140px',
        minWidth: '140px',
        background: tokens.colors.bgCardHover,
        borderRadius: '12px',
        overflow: 'hidden',
        border: `1px solid ${tokens.colors.borderLight}`,
        cursor: 'pointer',
        padding: 0,
        textAlign: 'right',
      }}
    >
      {/* תמונה ממוזערת */}
      <div
        style={{
          height: '90px',
          background: `url(${set.setImage}) center/cover`,
          position: 'relative',
        }}
      >
        {/* Badge רמת קושי */}
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            background: 'rgba(0,0,0,0.7)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '600',
            color: DIFFICULTY_COLORS[set.difficulty],
          }}
        >
          {DIFFICULTY_LABELS[set.difficulty]}
        </div>
      </div>

      {/* מידע */}
      <div style={{ padding: '8px 10px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: tokens.colors.text,
            marginBottom: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {set.name}
        </div>
        <div style={{ fontSize: '11px', color: tokens.colors.textMuted }}>
          {set.exerciseIds.length} תרגילים
        </div>
      </div>
    </button>
  );
};
```

### 2. Popup סט - `src/domains/exercises/components/ExerciseSetModal.tsx`

```typescript
import React from 'react';
import { ExerciseSet, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../types/exerciseSet.types';
import { tokens } from '@/styles/tokens';

interface ExerciseSetModalProps {
  set: ExerciseSet;
  onClose: () => void;
  onSelect: (exerciseIds: string[]) => void;
}

export const ExerciseSetModal: React.FC<ExerciseSetModalProps> = ({
  set,
  onClose,
  onSelect,
}) => {
  const handleSelect = () => {
    onSelect(set.exerciseIds);
    onClose();
  };

  return (
    // Overlay
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      {/* Modal */}
      <div
        style={{
          background: tokens.colors.bgCard,
          borderRadius: '16px',
          maxWidth: '400px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          direction: 'rtl',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            borderBottom: `1px solid ${tokens.colors.borderLight}`,
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: tokens.colors.text }}>
            {set.name}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: tokens.colors.textMuted,
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* תמונה גדולה */}
        <div
          style={{
            width: '100%',
            height: '200px',
            background: `url(${set.setImage}) center/cover`,
          }}
        />

        {/* מידע */}
        <div style={{ padding: '16px' }}>
          {/* מטא-דאטה */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '12px',
              fontSize: '14px',
            }}
          >
            <span style={{ color: tokens.colors.textMuted }}>
              {set.exerciseIds.length} תרגילים
            </span>
            <span style={{ color: tokens.colors.textMuted }}>•</span>
            <span style={{ color: DIFFICULTY_COLORS[set.difficulty] }}>
              {DIFFICULTY_LABELS[set.difficulty]}
            </span>
          </div>

          {/* תיאור */}
          {set.description && (
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: tokens.colors.textMuted,
                lineHeight: '1.5',
              }}
            >
              {set.description}
            </p>
          )}

          {/* כפתור בחירה */}
          <button
            onClick={handleSelect}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: tokens.colors.primary,
              color: '#0a1628',
              fontWeight: '600',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            בחר סט
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 3. סקשן סטים - `src/domains/exercises/components/RecommendedSets.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { ExerciseSetCard } from './ExerciseSetCard';
import { ExerciseSetModal } from './ExerciseSetModal';
import { getActiveSets } from '@/lib/firebase/exerciseSets';
import { ExerciseSet } from '../types/exerciseSet.types';
import { tokens } from '@/styles/tokens';

interface RecommendedSetsProps {
  muscleGroup?: string;
  onSelectSet: (exerciseIds: string[]) => void;
  selectedExerciseIds: string[];
}

export const RecommendedSets: React.FC<RecommendedSetsProps> = ({
  muscleGroup,
  onSelectSet,
  selectedExerciseIds,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMuscle, setFilterMuscle] = useState<string>('all');
  const [selectedSet, setSelectedSet] = useState<ExerciseSet | null>(null);

  // טעינת סטים
  useEffect(() => {
    const loadSets = async () => {
      setLoading(true);
      try {
        const data = await getActiveSets();
        setSets(data);
      } catch (error) {
        console.error('Failed to load exercise sets:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSets();
  }, []);

  // סינון סטים לפי קבוצת שריר
  const filteredSets = sets.filter(
    (set) => filterMuscle === 'all' || set.muscleGroup === filterMuscle
  );

  const handleSelectSet = (exerciseIds: string[]) => {
    onSelectSet(exerciseIds);
    setIsExpanded(false);
    setSelectedSet(null);
  };

  // אם אין סטים, לא להציג כלום
  if (sets.length === 0 && !loading) {
    return null;
  }

  return (
    <>
      <div
        style={{
          margin: '0 16px 16px',
          background: tokens.colors.bgCard,
          borderRadius: '14px',
          border: `1px solid ${isExpanded ? tokens.colors.primary : tokens.colors.borderLight}`,
          overflow: 'hidden',
        }}
      >
        {/* Header - Collapsed */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: '100%',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: tokens.colors.text,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🎯</span>
            <span style={{ fontWeight: '600', fontSize: '15px' }}>סטים מומלצים</span>
            <span
              style={{
                background: 'rgba(0, 191, 165, 0.2)',
                padding: '2px 10px',
                borderRadius: '10px',
                fontSize: '12px',
                color: tokens.colors.primary,
                fontWeight: '600',
              }}
            >
              {sets.length}
            </span>
          </div>
          <span
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
              fontSize: '12px',
              color: tokens.colors.textMuted,
            }}
          >
            ▼
          </span>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div style={{ padding: '0 12px 16px' }}>
            {/* פילטר קבוצות שריר */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '14px',
                borderBottom: `1px solid ${tokens.colors.borderLight}`,
                marginBottom: '14px',
              }}
            >
              {[
                { id: 'all', name: 'הכל' },
                { id: 'shoulders', name: 'כתפיים' },
                { id: 'chest', name: 'חזה' },
                { id: 'back', name: 'גב' },
                { id: 'legs', name: 'רגליים' },
                { id: 'arms', name: 'זרועות' },
                { id: 'core', name: 'ליבה' },
              ].map((muscle) => (
                <button
                  key={muscle.id}
                  onClick={() => setFilterMuscle(muscle.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background:
                      filterMuscle === muscle.id
                        ? tokens.colors.primary
                        : 'rgba(255,255,255,0.08)',
                    color: filterMuscle === muscle.id ? '#0a1628' : tokens.colors.textMuted,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {muscle.name}
                </button>
              ))}
            </div>

            {/* רשימת סטים - Grid אופקי */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: tokens.colors.textMuted }}>
                טוען...
              </div>
            ) : filteredSets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: tokens.colors.textMuted }}>
                אין סטים בקטגוריה זו
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  // Hide scrollbar but allow scroll
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {filteredSets.map((set) => (
                  <ExerciseSetCard
                    key={set.id}
                    set={set}
                    onClick={() => setSelectedSet(set)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedSet && (
        <ExerciseSetModal
          set={selectedSet}
          onClose={() => setSelectedSet(null)}
          onSelect={handleSelectSet}
        />
      )}
    </>
  );
};
```

## 📍 שינויים ב-ExerciseLibrary.tsx

### מיקום להוספה

מצא את המקום **אחרי פילטר הציוד ולפני רשימת התרגילים**.

בערך באזור של:
```jsx
{/* Equipment filter chips */}
...

{/* ← כאן להוסיף את RecommendedSets */}

{/* Exercise list */}
```

### קוד להוספה

```typescript
// בראש הקובץ - import
import { RecommendedSets } from './RecommendedSets';
import { useWorkoutBuilderStore } from '@/domains/workouts/store/workoutBuilderStore';

// בתוך הקומפוננטה - handler חדש
const addExercisesFromSet = useWorkoutBuilderStore((state) => state.addExercisesFromSet);

const handleSelectSet = (exerciseIds: string[]) => {
  // מצא את התרגילים המלאים לפי ה-IDs
  const exercisesToAdd = exercises
    .filter(ex => exerciseIds.includes(ex.id))
    .map(exercise => ({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseNameHe: exercise.nameHe,
      imageUrl: exercise.imageUrl,
      primaryMuscle: exercise.primaryMuscle || exercise.category,
      category: exercise.category,
      equipment: exercise.equipment,
      reportType: exercise.reportType,
      assistanceTypes: exercise.assistanceTypes,
      availableBands: exercise.availableBands,
    }));
  
  addExercisesFromSet(exercisesToAdd);
};

// ב-JSX - אחרי פילטר הציוד
<RecommendedSets
  muscleGroup={selectedPrimaryMuscle === 'all' ? undefined : selectedPrimaryMuscle}
  onSelectSet={handleSelectSet}
  selectedExerciseIds={selectedExercises.map(e => e.exerciseId)}
/>
```

## 🔴 מה לא לגעת

```typescript
// ❌ לא לשנות
handleToggleExercise  // הפונקציה הקיימת לבחירת תרגיל בודד
selectedExercises     // מבנה ה-state
filteredExercises     // הלוגיקה של הפילטרים
```

## ✅ בדיקות לפני סיום שלב 5

```markdown
## בדיקות שלב 5 - UI משתמש

### תצוגה
- [ ] סקשן "סטים מומלצים" מופיע
- [ ] Badge עם מספר סטים מוצג
- [ ] Collapse/expand עובד
- [ ] תמונות סטים נטענות
- [ ] Badge רמת קושי מוצג בצבע הנכון

### פילטר
- [ ] פילטר קבוצות שריר בתוך הסקשן עובד
- [ ] "הכל" מציג את כל הסטים
- [ ] בחירת קבוצה מסננת נכון

### בחירת סט
- [ ] לחיצה על "בחר סט" מוסיפה תרגילים
- [ ] סקשן נסגר אחרי בחירה
- [ ] התרגילים מסומנים כנבחרים ברשימה
- [ ] תרגילים כפולים לא נוספים

### רגרסיה - קריטי!
- [ ] בחירת תרגיל בודד עדיין עובדת
- [ ] ביטול בחירה עדיין עובד
- [ ] פילטר שרירים (מחוץ לסקשן) עדיין עובד
- [ ] פילטר ציוד עדיין עובד
- [ ] חיפוש עדיין עובד
- [ ] אינדיקטור "אחרון" מוצג נכון
- [ ] התחלת אימון עדיין עובדת
- [ ] שמירת אימון מתוכנן עדיין עובדת

### Mobile
- [ ] Mobile 375px - לא נחתך
- [ ] Mobile 375px - גלילה אופקית בפילטרים עובדת
- [ ] Mobile 375px - כרטיסי סטים מוצגים נכון
- [ ] RTL תקין בכל האלמנטים
```

## 📝 תבנית סיום (למלא אחרי ביצוע)
```
📋 Summary:
- Changed: [קבצים ששונו]
- Tested: [בדיקות שעברו מהרשימה למעלה]
- Next: שלב 6 - ליטוש ובדיקות סופיות

🔐 Security: N/A (משתמש ב-rules משלב 1)
```

---

# שלב 6: ליטוש ובדיקות סופיות

## 📝 תבנית פתיחה
```
🎯 Goal: ליטוש, תיקון באגים, ובדיקות E2E מלאות לפני Deploy
🏁 Done: E2E מלא עובר, npm run build עובר, כל הבדיקות עוברות
📁 Files: 
   - תיקונים לפי הצורך בקבצים קיימים
⚠️ Dependencies: 
   - כל השלבים הקודמים (0-5) הושלמו בהצלחה
```

## 📖 Skills לקרוא לפני התחלה
```
קרא: .claude/qa-testing-SKILL.md
```

## 🎯 מטרה
ליטוש, תיקון באגים, ובדיקות E2E מלאות.

## 📋 משימות

### 1. Loading States
- [ ] טעינת סטים מציגה spinner/skeleton
- [ ] העלאת תמונה מציגה progress
- [ ] שמירה מציגה loading בכפתור

### 2. Empty States
- [ ] אין סטים - הודעה מתאימה לאדמין
- [ ] אין סטים בקטגוריה - הודעה מתאימה למשתמש
- [ ] סקשן לא מוצג כשאין סטים בכלל

### 3. Error Handling
- [ ] תרגיל שנמחק מהסט - לא קורס
- [ ] תמונה שנמחקה - fallback מוצג
- [ ] שגיאת רשת - הודעה למשתמש
- [ ] שגיאת Storage - הודעה לאדמין

### 4. Accessibility
- [ ] כל הכפתורים לחיצים במקלדת
- [ ] סדר Tab הגיוני
- [ ] contrast מספיק לטקסט

## ✅ בדיקת E2E מלאה

```markdown
## E2E Test - Full Flow

### הכנה
- [ ] יש משתמש אדמין
- [ ] יש לפחות 5 תרגילי כתפיים במערכת

### אדמין - יצירת סט
1. [ ] כניסה כאדמין
2. [ ] ניווט ל-/admin/sets
3. [ ] לחיצה "+ הוסף סט"
4. [ ] מילוי שם: "כתפיים בסיסי"
5. [ ] בחירת קבוצת שריר: כתפיים
6. [ ] בחירת רמה: מתחילים
7. [ ] העלאת תמונה (jpg, <2MB)
8. [ ] בחירת 3 תרגילים
9. [ ] לחיצה "שמור"
10. [ ] וידוא שהסט מופיע ברשימה

### משתמש - בחירת סט
1. [ ] כניסה כמשתמש רגיל
2. [ ] ניווט לבחירת תרגילים
3. [ ] פתיחת "סטים מומלצים"
4. [ ] לחיצה "בחר סט" על "כתפיים בסיסי"
5. [ ] וידוא ש-3 תרגילים נוספו
6. [ ] וידוא שהסקשן נסגר

### משתמש - הוספה ידנית
1. [ ] הוספת תרגיל בודד נוסף
2. [ ] וידוא ש-4 תרגילים נבחרו

### משתמש - אימון
1. [ ] לחיצה "התחל אימון"
2. [ ] וידוא ש-4 תרגילים באימון
3. [ ] ביצוע סט אחד בכל תרגיל
4. [ ] סיום אימון
5. [ ] וידוא שנשמר להיסטוריה

### אדמין - עריכה
1. [ ] חזרה ל-/admin/sets
2. [ ] לחיצה על "כתפיים בסיסי"
3. [ ] שינוי שם ל-"כתפיים בסיסי מעודכן"
4. [ ] שמירה
5. [ ] וידוא שהשם עודכן

### אדמין - מחיקה
1. [ ] Toggle "לא פעיל" על הסט
2. [ ] וידוא שלא מופיע למשתמש רגיל
```

## 📝 תבנית סיום (למלא אחרי ביצוע)
```
📋 Summary:
- Changed: [תיקונים שבוצעו]
- Tested: [E2E עבר, רגרסיה עברה]
- Next: שלב 7 - עדכון תיעוד → Deploy

🔐 Security: 
- [ ] בדיקה סופית של rules
- [ ] משתמש רגיל לא יכול לגשת לאדמין
```

---

# שלב 7: עדכון תיעוד ו-Deploy

## 📝 תבנית פתיחה
```
🎯 Goal: עדכון תיעוד, CHANGELOG, וביצוע Deploy יחיד ל-Production
🏁 Done: תיעוד מעודכן, Deploy הצליח, בדיקה על Production עברה
📁 Files: 
   - עדכון: .claude/qa-testing-SKILL.md
   - עדכון: CHANGELOG.md
⚠️ Dependencies: 
   - כל השלבים הקודמים (0-6) הושלמו בהצלחה
   - npm run build עובר
```

## 📖 Skills לעדכן
```
.claude/qa-testing-SKILL.md
```

## 📋 הוספות לתיעוד

### הוספה ל-qa-testing-SKILL.md

```markdown
### Exercise Sets Regression Checks

בכל שינוי הקשור לסטים או לבחירת תרגילים:

- [ ] בחירת תרגיל בודד עדיין עובדת
- [ ] בחירת סט מוסיפה תרגילים
- [ ] תרגילים כפולים לא נוספים
- [ ] פילטרים עובדים עם הסקשן גלוי
- [ ] Mobile 375px - גלילה אופקית בכרטיסי סטים
- [ ] ניהול סטים באדמין עובד
- [ ] העלאת תמונות עובדת
- [ ] Drag & Drop לסדר סטים עובד
```

### יצירת CHANGELOG

```markdown
## [X.X.X] - YYYY-MM-DD

### Added
- סטים מומלצים - יכולת לאדמין להגדיר סטים מוכנים של תרגילים
- ממשק ניהול סטים באדמין פאנל עם Drag & Drop
- סקשן "סטים מומלצים" במסך בחירת תרגילים
- שינוי UI לשורת בחירת מצב (עכשיו/להיום/תאריך)

### Changed
- שורת בחירת מצב האימון - 3 כפתורים בשורה אחת

### Technical
- Collection חדש: exerciseSets
- Firebase Storage: exercise-sets/
- Action חדש: addExercisesFromSet
```

## 🚀 Deploy ל-Production

### לפני Deploy - צ'קליסט:
```bash
npm run build  # חייב לעבור בלי errors!
```
- [ ] E2E מלא עבר מקומית
- [ ] כל הבדיקות מכל השלבים עברו
- [ ] CHANGELOG מעודכן
- [ ] qa-testing-SKILL.md מעודכן

### ביצוע Deploy:
```bash
firebase deploy
```

### אחרי Deploy - בדיקות Production:
- [ ] האפליקציה עולה
- [ ] יצירת סט באדמין עובדת
- [ ] בחירת סט כמשתמש עובדת
- [ ] אימון שלם עובד
- [ ] Mobile עובד

## 📝 תבנית סיום (למלא אחרי ביצוע)
```
📋 Summary:
- Changed: תיעוד מעודכן, CHANGELOG מעודכן
- Tested: Production בדיקות עברו
- Next: ✅ פרויקט הושלם!

🔐 Security: 
- [ ] בדיקה סופית על Production
```

---

# סיכום קבצים

## קבצים חדשים (~12)
```
src/domains/exercises/types/exerciseSet.types.ts
src/lib/firebase/exerciseSets.ts
src/lib/firebase/exerciseSetStorage.ts
src/pages/admin/ExerciseSetsPage.tsx
src/domains/admin/components/ExerciseSetManager.tsx
src/domains/admin/components/ExerciseSetForm.tsx
src/domains/admin/components/ExerciseSetExercisePicker.tsx
src/domains/admin/components/ExerciseSetImageUpload.tsx
src/domains/exercises/components/RecommendedSets.tsx
src/domains/exercises/components/ExerciseSetCard.tsx
```

## קבצים לעדכון (~6)
```
firestore.rules
storage.rules
src/App.tsx
src/domains/admin/components/AdminLayout.tsx (או דומה)
src/domains/workouts/store/workoutBuilderStore.ts
src/domains/exercises/components/ExerciseLibrary.tsx
.claude/qa-testing-SKILL.md
```

---

# תלויות בין שלבים

```
שלב 0 (Toggle Row)
    │
    └──→ שלב 1 (תשתית)
              │
              ├──→ שלב 2 (אדמין רשימה)
              │         │
              │         └──→ שלב 3 (אדמין טופס)
              │
              └──→ שלב 4 (Store)
                        │
                        └──→ שלב 5 (UI משתמש)
                                  │
                                  └──→ שלב 6 (ליטוש)
                                            │
                                            └──→ שלב 7 (תיעוד)
```

**אפשר במקביל:** שלבים 2+3 (אדמין) ו-4 (Store) אחרי שלב 1

---

# הערות חשובות לסוכן

1. **בכל שלב** - קרא את ה-Skills הרלוונטיים
2. **בכל שינוי בקובץ קיים** - הרץ בדיקות רגרסיה
3. **בכל שינוי UI** - בדוק Mobile 375px
4. **לפני מעבר לשלב הבא** - וודא שכל הבדיקות עוברות
5. **אם משהו נשבר** - עצור ותקן לפני שממשיכים
