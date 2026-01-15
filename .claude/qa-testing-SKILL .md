---
name: gymiq-qa-testing
description: "Comprehensive QA testing protocols for GymIQ fitness app. Automates testing scenarios, regression checks, and user flow validation. Use when testing new features, verifying bug fixes, or performing pre-deployment checks."
---

# GymIQ QA Testing

**מתי להפעיל:** אחרי כל שינוי בקוד, לפני deployment, או כשצריך לוודא שפיצ'רים עובדים נכון

## Critical Testing Flow
בהתבסס על qa_scenarios.md, בצע בדיקות אלו בסדר זה:

### 1. Dashboard & Navigation (P1)
```
□ דשבורד נטען ללא שגיאות קונסול
□ כל הכפתורים מגיבים למגע
□ ניווט לכל המסכים עובד
□ Header יציב (לא קופץ/זז) בעבר בין מסכים
```

### 2. Workout Flow (P1 - קריטי!)
```
□ יצירת אימון: דשבורד → "התחל אימון" → בחירת תרגילים
□ אימון פעיל: הוספת סטים + Auto-save כל דיווח
□ טיימר מנוחה: מופיע אחרי הוספת סט
□ סיום אימון: פופאפ WorkoutSummaryModal עם קלוריות
□ שמירה להיסטוריה: נתונים נשמרו נכון
```

### 3. Data Integrity (P1)
```
□ קלוריות בהיסטוריה: משתמש ב-workout.calories (לא estimateCalories)
□ נתוני סטים: משתמש בנתונים השמורים
□ אוטו-סייב: נתונים נשמרים בזמן אמת
```

### 4. Mobile & RTL (P1)
```
□ 375px width: אין גלילה אופקית
□ Touch targets: כפתורים 44x44px מינימום
□ RTL: טקסט עברי זורם נכון מימין לשמאל
□ כפתור חזור: ימין בעברית
```

## Testing Commands

### Quick Regression Check
```bash
# בדוק רכיבים קריטיים
grep -r "WorkoutSummaryModal" src/
grep -r "handleDeleteWorkout" src/
grep -r "workout.calories" src/
```

### Console Monitoring
```javascript
// בדוק שגיאות בקונסול
console.clear();
// בצע פעולות ובדוק שאין שגיאות אדומות
```

### Mobile Testing
```bash
# DevTools
1. F12 → Toggle Device Toolbar
2. Set to iPhone SE (375px)
3. Test full user flows
4. Check touch interactions
```

## Test Data Requirements

### Before Testing - Ensure Real Data Exists:
- משתמש מחובר עם אימונים קיימים
- תרגילים בספריה
- אימון in_progress אם רלוונטי

### Common Test Scenarios:
1. **חדש**: משתמש ללא היסטוריה
2. **חוזר**: משתמש עם אימונים קיימים
3. **אימון בתהליך**: חזרה לאימון החצוי

## Post-Test Checklist
```
□ כל הזרימות העיקריות עובדות
□ אין שגיאות קונסול
□ נתונים נשמרים ומוצגים נכון
□ מובייל responsive וגלילה תקינה
□ RTL עברית תקין
□ לא נוצרו רגרסיות בפיצ'רים קיימים
```

## Historical Regressions Monitor
תמיד לבדוק שאלו לא נשברו שוב:
- ✅ קלוריות מוצגות בהיסטוריה
- ✅ פופאפ סיכום אימון קיים
- ✅ כפתור מחיקת אימון פעיל
- ✅ Navigation bar יציב
- ✅ שדה Volume קיים

## Anti-Destruction Protocol 🚨
**לפני כל deployment - בדיקה מלאה שלא נהרסו דברים:**

### Critical Components Survival Check:
```bash
# 1. ודא שכפתורים קריטיים קיימים
grep -r "🗑\|Trash2\|delete" src/ | wc -l  # אמור להיות >0
grep -r "WorkoutSummaryModal" src/ | wc -l   # אמור להיות >0  
grep -r "handleAddSet" src/ | wc -l          # אמור להיות >0
grep -r "useTimer" src/ | wc -l              # אמור להיות >0

# 2. ודא שנתונים משתמשים בשדות הנכונים
grep -r "workout\.calories" src/ | wc -l     # אמור להיות >0
grep -r "estimateCalories" src/              # לא אמור להופיע בקוד תצוגה!
```

### Full User Journey Test (Must Pass):
```
1. דשבורד → בדוק שכל הכפתורים מגיבים
2. התחל אימון → ודא שהתהליך עובד מתחילה לסוף
3. אימון פעיל → הוסף סט, ודא שנשמר מיד
4. סיום אימון → ודא שפופאפ סיכום מופיע
5. היסטוריה → ודא שקלוריות מוצגות נכון
6. חזור לכל מסך → ודא שheader לא "קופץ"
```

### Break Detection Commands:
```bash
# אם משהו נראה שבור, הרץ:
npm run build 2>&1 | grep -i error
npm run lint 2>&1 | grep -i error  
# console.clear() בדפדפן, אז לבדוק שגיאות

# אם יש שגיאות - עצור את הdeploy!
```

השתמש בסקיל זה כדי לוודא איכות גבוהה ומניעת רגרסיות שפגעו בעבר במשתמשי GymIQ.
