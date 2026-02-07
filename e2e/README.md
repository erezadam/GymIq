# מערכת בדיקות E2E - GymIQ

## סקירה כללית

מערכת בדיקות קצה-לקצה (End-to-End) מבוססת **Playwright** לאפליקציית GymIQ.

### מטרות המערכת:
- אימות זרימות משתמש מלאות מהתחברות ועד השלמת אימון
- בדיקת הרשאות גישה לפי תפקידים (Admin, Trainer, User)
- בדיקת אינטראקציה בין מאמן למתאמן
- זיהוי רגרסיות לפני פריסה לייצור
- תמיכה בבדיקות Desktop ו-Mobile

### סטטיסטיקות:
- **6 קבצי בדיקות** + 2 קבצי עזר
- **~70 טסטים** בסך הכל
- **זמן ריצה**: כ-10-15 דקות (כולל chromium + mobile)

---

## דרישות מקדימות

### 1. התקנות נדרשות

```bash
# התקנת dependencies
npm install

# התקנת דפדפני Playwright
npx playwright install
```

### 2. משתני סביבה

יש ליצור קובץ `.env.local` בתיקיית השורש עם המשתנים הבאים:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# E2E Test Users (חובה!)
E2E_ADMIN_EMAIL=admin@test.gymiq.com
E2E_ADMIN_PASSWORD=Admin@Test2026!
E2E_TRAINER_EMAIL=trainer@test.gymiq.com
E2E_TRAINER_PASSWORD=Trainer@Test2026!
E2E_USER_EMAIL=user@test.gymiq.com
E2E_USER_PASSWORD=User@Test2026!
```

### 3. משתמשי בדיקה

המשתמשים הבאים חייבים להיות קיימים ב-Firebase עם התפקידים המתאימים:

| משתמש | תפקיד | הרשאות |
|-------|-------|--------|
| `admin@test.gymiq.com` | Admin | `/admin/*`, `/trainer/*`, `/dashboard`, `/workout/*` |
| `trainer@test.gymiq.com` | Trainer | `/trainer/*`, `/dashboard`, `/workout/*` |
| `user@test.gymiq.com` | User | `/dashboard`, `/workout/*`, `/exercises`, `/inbox` |

---

## רשימת קבצי הבדיקות

### 📁 `e2e/auth.spec.ts`
**תיאור:** בדיקות התחברות והתנתקות לכל סוגי המשתמשים

| טסט | תיאור |
|-----|-------|
| `admin user can login and is redirected to admin dashboard` | התחברות אדמין → הפניה ל-/admin |
| `trainer user can login and is redirected to dashboard` | התחברות מאמן → הפניה ל-/dashboard |
| `regular user can login and is redirected to dashboard` | התחברות משתמש → הפניה ל-/dashboard |
| `shows error message with incorrect password` | שגיאה בסיסמה שגויה |
| `shows error message with non-existent email` | שגיאה באימייל לא קיים |
| `user can logout and is redirected to login page` | התנתקות → הפניה ל-/login |
| `authenticated user accessing /login is redirected to dashboard` | משתמש מחובר לא יכול לגשת ל-/login |

---

### 📁 `e2e/route-guards.spec.ts`
**תיאור:** בדיקות הרשאות גישה לנתיבים לפי תפקיד

| קבוצה | טסטים |
|-------|--------|
| **Unauthenticated Access** | הפניה ל-/login בגישה ל-/dashboard, /trainer, /admin |
| **Regular User (role: user)** | גישה ל-/dashboard, /exercises, /workout/history ✅ · חסימה מ-/trainer, /admin ❌ |
| **Trainer User (role: trainer)** | גישה ל-/trainer, /trainer/messages ✅ · חסימה מ-/admin ❌ |
| **Admin User (role: admin)** | גישה לכל הנתיבים ✅ |
| **Direct URL Access** | בדיקת bookmark לנתיבים מוגבלים |

---

### 📁 `e2e/workout-flow.spec.ts`
**תיאור:** בדיקות זרימת אימון בסיסית

| טסט | תיאור |
|-----|-------|
| `user can navigate from dashboard to exercise library` | ניווט מדשבורד לספריית תרגילים |
| `exercise library displays exercises and filters` | תצוגת תרגילים ופילטרים |
| `user can select exercises in exercise library` | בחירת תרגילים |
| `user can start workout after selecting exercises` | התחלת אימון |
| `workout session displays selected exercises` | תצוגת תרגילים באימון |
| `workout builder/session shows exercise controls` | פקדי תרגיל באימון |
| `finish workout button exists and is clickable` | כפתור סיום אימון |
| `user can access exercises page directly` | גישה ישירה לספריית תרגילים |
| `user can access workout history directly` | גישה ישירה להיסטוריה |

---

### 📁 `e2e/workout-history.spec.ts`
**תיאור:** בדיקות היסטוריית אימונים

| טסט | תיאור |
|-----|-------|
| `user can access workout history page` | גישה לדף היסטוריה |
| `workout history page displays workout list or empty state` | תצוגת רשימת אימונים או מצב ריק |
| `workout history shows date grouping or filters` | קיבוץ לפי תאריך/פילטרים |
| `can navigate to workout detail page if workouts exist` | ניווט לפרטי אימון |
| `can navigate from dashboard to history via sidebar` | ניווט מדשבורד להיסטוריה |
| `history page has back navigation` | ניווט חזרה |

---

### 📁 `e2e/trainer-dashboard.spec.ts`
**תיאור:** בדיקות דשבורד מאמן

| טסט | תיאור |
|-----|-------|
| `trainer can access trainer dashboard` | גישה לדשבורד מאמן |
| `trainer dashboard shows trainee list or empty state` | תצוגת מתאמנים |
| `trainer can access messages page` | גישה לדף הודעות |
| `trainer can navigate between trainer and user dashboard` | ניווט בין דשבורדים |
| `regular user cannot access trainer dashboard` | חסימת משתמש רגיל |

---

### 📁 `e2e/trainer-trainee-flows.spec.ts`
**תיאור:** בדיקות זרימות מלאות מאמן-מתאמן (הקובץ הגדול והמקיף ביותר)

#### Trainer → Trainee Flows
| קבוצה | טסטים |
|-------|--------|
| **Trainer Dashboard** | תצוגת גריד מתאמנים, פתיחת מודל רישום |
| **Trainee Detail Page** | גישה לדף מתאמן, תצוגת סקשנים |
| **Program Creation** | גישה לבונה תוכניות, wizard שלבים |
| **Messaging** | מרכז הודעות, חלון שליחת הודעה |
| **Standalone Workout** | יצירת אימון בודד למתאמן |
| **Report Workout** | דיווח אימון עבור מתאמן |
| **View Workouts** | צפייה באימונים אחרונים של מתאמן |

#### Trainee → Trainer Flows
| קבוצה | טסטים |
|-------|--------|
| **Trainee Dashboard** | תצוגת דשבורד עם תוכן מאמן |
| **View Programs** | צפייה בתוכניות מוקצות |
| **Inbox** | גישה לתיבת הודעות, סימון כנקרא |
| **Execute Workout** | ביצוע אימון מתוכנית |
| **Workout History** | היסטוריה עם אימונים שדווחו ע"י מאמן |

#### Comprehensive Tests
| טסט | תיאור |
|-----|-------|
| `trainee can start workout, log sets, and finish` | אימון מלא עם דיווח סטים |
| `trainee completes full workout with exercises and sets` | השלמת אימון מלא |
| `trainer sees correct stats after trainee completes workout` | מאמן רואה סטטיסטיקות נכונות |
| `full E2E: trainee completes workout, trainer sees updated stats` | E2E מלא עם החלפת משתמשים |
| `complete scenario: trainer creates 10-exercise workout, trainee reports all sets` | תסריט 10 תרגילים מלא |
| `trainee completes 4-exercise workout with proper modal handling` | 4 תרגילים עם טיפול נכון במודלים |
| `trainer creates 4-exercise workout, trainee executes and completes, verify in history` | **הטסט המקיף ביותר** - זרימה מלאה מאמן→מתאמן→אימות |

---

### 📁 `e2e/helpers/`
**קבצי עזר:**

| קובץ | תיאור |
|------|-------|
| `test-users.ts` | הגדרת משתמשי בדיקה (admin, trainer, user) |
| `auth-helper.ts` | פונקציות עזר להתחברות והתנתקות |

---

## פקודות הרצה

### טבלת פקודות

| פקודה | תיאור |
|-------|-------|
| `npx playwright test` | הרצת כל הטסטים |
| `npx playwright test auth.spec.ts` | הרצת קובץ בודד |
| `npx playwright test --grep "trainer creates"` | הרצת טסט לפי שם |
| `npx playwright test --project=chromium` | הרצה רק ב-Chromium |
| `npx playwright test --project=mobile` | הרצה רק ב-Mobile (iPhone 13) |
| `npx playwright test --ui` | הרצה עם ממשק ויזואלי |
| `npx playwright test --debug` | הרצה במצב Debug |
| `npx playwright test --headed` | הרצה עם דפדפן גלוי |
| `npx playwright show-report` | צפייה בדוח HTML |

### דוגמאות שימוש

```bash
# הרצת כל הטסטים
npx playwright test

# הרצת טסט ספציפי
npx playwright test --grep "trainer creates 4-exercise"

# הרצת קובץ אחד על chromium בלבד
npx playwright test trainer-trainee-flows.spec.ts --project=chromium

# הרצה עם דפדפן גלוי לצפייה
npx playwright test --headed --project=chromium

# מצב debug אינטראקטיבי
npx playwright test --debug

# ממשק ויזואלי לבחירת טסטים
npx playwright test --ui

# צפייה בדוח תוצאות אחרון
npx playwright show-report
```

---

## באגים שנמצאו ותוקנו

### 1. ספירת אימונים שגויה בסטטיסטיקות
**תיאור:** `getUserWorkoutStats` ספר את כל האימונים במקום רק `completed`

**קובץ:** `src/lib/firebase/workoutHistory.ts`

**תיקון:**
```typescript
// לפני - ספירת כל האימונים
const thisWeekWorkouts = thisWeekDocs.filter(...)

// אחרי - ספירת רק completed
const thisWeekWorkouts = thisWeekDocs.filter(
  doc => doc.data().status === 'completed' && ...
)
```

### 2. סלקטורים שגויים לסגירת אימון
**תיאור:** הטסטים השתמשו בסלקטורים שלא תאמו ל-UI האמיתי

**סלקטורים שתוקנו:**

| שגוי | נכון |
|------|------|
| `button:has-text("אישור")` | `button:has-text("סיים")` |
| `button:has-text("כן")` | `button:has-text("כן, סיים")` |
| `button:has-text("שמור")` | `button:has-text("שמור וסיים")` |
| `text=סיכום אימון` | `text=כל הכבוד!` |

### 3. התנתקות לא מלאה מ-Firebase
**תיאור:** Firebase Auth שומר state ב-IndexedDB, לא רק ב-localStorage

**תיקון:**
```typescript
// ניקוי מלא לפני החלפת משתמש
await page.evaluate(async () => {
  localStorage.clear()
  sessionStorage.clear()
  const databases = await indexedDB.databases()
  for (const db of databases) {
    if (db.name) indexedDB.deleteDatabase(db.name)
  }
})
await page.reload()
```

### 4. טסטים יצרו אימונים ריקים
**תיאור:** הטסטים לא מילאו נתוני סטים לפני סגירת האימון

**תיקון:** נוספה פונקציית `performCompleteWorkout` שמבצעת:
- בחירת תרגילים
- מילוי משקל וחזרות לכל סט
- סימון תרגילים כמושלמים
- סגירה נכונה של האימון

---

## מה מכוסה ומה חסר

### ✅ מכוסה

| תחום | כיסוי |
|------|-------|
| **התחברות/התנתקות** | כל 3 סוגי המשתמשים |
| **הרשאות נתיבים** | כל הנתיבים והתפקידים |
| **זרימת אימון בסיסית** | בחירה → התחלה → סיום |
| **זרימת אימון מלאה** | דיווח סטים, משקל, חזרות |
| **היסטוריית אימונים** | צפייה ופרטים |
| **דשבורד מאמן** | תצוגה וניווט |
| **יצירת אימון למתאמן** | אימון בודד |
| **ביצוע אימון ע"י מתאמן** | זרימה מלאה |
| **אימות סטטוס אימון** | בדיקת "הושלם" בהיסטוריה |
| **רספונסיביות** | בדיקות Desktop + Mobile |

### ❌ חסר / לשיפור עתידי

| תחום | סטטוס |
|------|-------|
| **יצירת תוכנית אימונים מלאה** | חלקי - רק בדיקת גישה |
| **עריכת תוכנית קיימת** | לא מכוסה |
| **שליחת הודעות** | חלקי - רק בדיקת UI |
| **מחיקת אימון** | לא מכוסה |
| **העתקת אימון** | לא מכוסה |
| **פרופיל משתמש** | לא מכוסה |
| **הגדרות** | לא מכוסה |
| **Push Notifications** | לא מכוסה |
| **Offline Mode** | לא מכוסה |
| **Performance Tests** | לא מכוסה |
| **Accessibility Tests** | לא מכוסה |
| **Visual Regression** | לא מכוסה |

---

## הערות חשובות

### Rate Limiting
Firebase מגביל login requests. הטסטים מוגדרים להריץ בסדר סדרתי (`serial`) כדי למנוע חסימות.

### זמני המתנה
יש waitForTimeout במקומות שונים כדי לתת ל-Firebase לסנכרן. ניתן לשפר עם waitForSelector יותר ספציפיים.

### תלות ב-State
חלק מהטסטים תלויים בנתונים קיימים ב-Firebase (תרגילים, מתאמנים). אם אין נתונים, חלק מהטסטים ידלגו.

---

## עדכון אחרון
**תאריך:** 07/02/2026

**שינויים אחרונים:**
- תיקון סלקטורים לסגירת אימון
- הוספת טסט זרימה מלאה מאמן-מתאמן
- הוספת אימות סטטוס "הושלם"
- תיעוד מלא במסמך זה
