# עיצוב מסך אימון פעיל - GymIQ
## Workout Session Design System Documentation

---

## סקירה כללית

מסמך זה מתאר את כל הסגנונות (CSS Classes) שנוצרו עבור מסך האימון הפעיל.
כל הסגנונות נמצאים בקובץ `src/index.css` תחת הסקשן "WORKOUT SESSION SCREEN".

---

## 1. מיכל ראשי | Main Container

### `.workout-session-screen`
**תיאור:** המיכל הראשי של כל מסך האימון
```css
- min-h-screen     → גובה מינימלי של כל המסך
- bg-neon-dark     → רקע כהה (צבע הבסיס של האפליקציה)
- pb-24            → ריפוד תחתון של 6rem (96px) לפינוי מקום לכפתור התחתון
```

---

## 2. כותרת ניווט תרגילים | Exercise Navigation Header

### `.exercise-nav-header`
**תיאור:** הכותרת העליונה עם ניווט בין תרגילים
```css
- flex items-center justify-between  → פריסת Flexbox עם מרווח בין האלמנטים
- px-4 py-3                          → ריפוד אופקי 1rem, אנכי 0.75rem
- bg-neon-gray-900                   → רקע אפור כהה
- border-b border-neon-gray-800      → קו תחתון אפור
```

### `.exercise-nav-btn`
**תיאור:** כפתורי הכותרת (סגירה, תפריט)
```css
- p-2                                → ריפוד 0.5rem
- text-neon-gray-400                 → צבע טקסט אפור בהיר
- hover:text-white                   → לבן בריחוף
- transition-colors                  → אנימציית מעבר צבע
```

### `.exercise-nav-center`
**תיאור:** אזור המרכז עם מונה התרגילים והחיצים
```css
- flex items-center gap-4            → פריסת Flexbox עם רווח 1rem
```

### `.exercise-nav-arrow`
**תיאור:** חיצי הניווט (קודם/הבא)
```css
- p-2                                → ריפוד 0.5rem
- text-neon-cyan                     → צבע טורקיז (הצבע הראשי)
- disabled:text-neon-gray-600        → אפור כשלא זמין
- disabled:cursor-not-allowed        → סמן "לא מותר" כשלא זמין
- transition-colors                  → אנימציית מעבר
```

### `.exercise-nav-counter`
**תיאור:** טקסט מונה התרגילים ("תרגיל 1/7")
```css
- text-white                         → צבע לבן
- text-lg font-medium                → גודל גופן בינוני-גדול
```

### `.exercise-nav-menu`
**תיאור:** תפריט נפתח עם אפשרויות נוספות
```css
- absolute top-full left-0 mt-2      → מיקום מתחת לכפתור
- w-48                               → רוחב 12rem
- bg-neon-gray-800                   → רקע אפור
- border border-neon-gray-700        → מסגרת אפורה
- rounded-xl overflow-hidden         → פינות מעוגלות
- shadow-lg z-50                     → צל ושכבת עומק גבוהה
```

### `.exercise-nav-menu-item`
**תיאור:** פריט בתפריט הנפתח
```css
- w-full px-4 py-3                   → רוחב מלא עם ריפוד
- text-right text-white              → יישור לימין (RTL), צבע לבן
- flex items-center gap-3            → Flexbox עם רווח לאייקון
- hover:bg-neon-gray-700             → רקע כהה יותר בריחוף
- transition-colors                  → אנימציית מעבר
```

---

## 3. סרגל סטטיסטיקות | Stats Bar

### `.workout-session-stats`
**תיאור:** סרגל הסטטיסטיקות (זמן, סטים, נפח)
```css
- flex justify-around                → פריסה שווה בין הפריטים
- py-3                               → ריפוד אנכי 0.75rem
- bg-neon-gray-800/50                → רקע אפור חצי-שקוף
- border-b border-neon-gray-800      → קו תחתון
```

### `.workout-session-stat`
**תיאור:** פריט סטטיסטיקה בודד
```css
- flex items-center gap-2            → Flexbox עם רווח קטן
- text-sm                            → גודל גופן קטן
```

---

## 4. תוכן ראשי | Main Content

### `.workout-session-content`
**תיאור:** אזור התוכן הראשי
```css
- px-4 py-4                          → ריפוד 1rem
- space-y-4                          → רווח אנכי בין אלמנטים
```

### `.workout-session-exercise-details`
**תיאור:** אזור פרטי התרגיל (שם והוראות)
```css
- py-2                               → ריפוד אנכי קטן
```

---

## 5. מדיה של התרגיל | Exercise Media

### `.exercise-media-placeholder`
**תיאור:** מיכל placeholder כשאין תמונה
```css
- flex flex-col items-center justify-center  → מרכוז אנכי ואופקי
- h-48                               → גובה 12rem
- mx-auto                            → מרכוז אופקי
- bg-neon-gray-800 rounded-xl        → רקע אפור עם פינות מעוגלות
```

### `.exercise-media-thumbnail`
**תיאור:** תמונה ממוזערת של התרגיל
```css
- relative                           → מיקום יחסי (לשכבות על)
- h-48                               → גובה 12rem
- rounded-xl overflow-hidden         → פינות מעוגלות
- cursor-pointer                     → סמן לחיצה
- bg-neon-gray-800                   → רקע אפור
```

### `.exercise-media-play-overlay`
**תיאור:** שכבת כפתור Play (לוידאו)
```css
- absolute inset-0                   → מכסה את כל התמונה
- flex items-center justify-center   → מרכוז הכפתור
- bg-black/30                        → רקע שחור 30% שקיפות
```

### `.exercise-media-play-btn`
**תיאור:** כפתור Play עצמו
```css
- w-16 h-16                          → גודל 4rem x 4rem
- rounded-full                       → עיגול
- flex items-center justify-center   → מרכוז האייקון
- bg-black/50 backdrop-blur-sm       → רקע מטושטש
```

### `.exercise-media-gradient`
**תיאור:** גרדיאנט תחתון על התמונה
```css
- absolute inset-0                   → מכסה את כל התמונה
- bg-gradient-to-t from-black/40 to-transparent  → גרדיאנט מלמטה
```

### `.exercise-media-modal`
**תיאור:** מודל תמונה/וידאו במסך מלא
```css
- fixed inset-0 z-50                 → מסך מלא עם שכבה גבוהה
- bg-black/90                        → רקע שחור כמעט אטום
- flex items-center justify-center   → מרכוז התוכן
- p-4                                → ריפוד
```

### `.exercise-media-modal-close`
**תיאור:** כפתור סגירת המודל
```css
- absolute top-4 right-4             → פינה ימנית עליונה
- p-2                                → ריפוד
- text-white hover:text-neon-gray-300  → צבע לבן עם שינוי בריחוף
```

### `.exercise-media-modal-content`
**תיאור:** תוכן המודל
```css
- max-w-lg w-full                    → רוחב מקסימלי 32rem
```

---

## 6. רשימת סטים | Sets List

### `.workout-session-sets`
**תיאור:** מיכל רשימת הסטים
```css
- space-y-3                          → רווח אנכי 0.75rem בין הסטים
```

---

## 7. שורת סט שהושלם | Completed Set Row

### `.set-row-completed`
**תיאור:** שורת סט שהושלם
```css
- flex items-center justify-between  → פריסה אופקית
- p-3                                → ריפוד 0.75rem
- rounded-xl                         → פינות מעוגלות
- bg-transparent                     → רקע שקוף
```

### `.set-row-fields`
**תיאור:** אזור השדות (RIR, חזרות, משקל)
```css
- flex items-center gap-3            → פריסה עם רווחים
- flex-1                             → מתרחב לכל הרוחב הזמין
```

### `.set-row-field`
**תיאור:** שדה בודד (תווית + ערך)
```css
- flex flex-col items-center         → עמודה ממורכזת
```

### `.set-row-divider`
**תיאור:** קו מפריד בין שדות
```css
- w-px h-8                           → קו אנכי בגובה 2rem
- bg-neon-gray-600                   → צבע אפור
```

### `.set-row-badge`
**תיאור:** תג מספר הסט (עיגול)
```css
- w-8 h-8                            → גודל 2rem x 2rem
- rounded-full                       → עיגול מלא
- flex items-center justify-center   → מרכוז המספר
- text-sm font-bold                  → גופן קטן ומודגש
```

### `.set-row-badge.completed`
**תיאור:** תג סט שהושלם
```css
- bg-neon-cyan                       → רקע טורקיז
- text-neon-dark                     → טקסט כהה
```

### `.set-row-badge.upcoming`
**תיאור:** תג סט עתידי
```css
- bg-neon-gray-600                   → רקע אפור
- text-neon-gray-400                 → טקסט אפור בהיר
```

---

## 8. שורת סט עתידי | Upcoming Set Row

### `.set-row-upcoming`
**תיאור:** שורת סט עתידי (טרם בוצע)
```css
- flex items-center justify-between  → פריסה אופקית
- p-3                                → ריפוד
- rounded-xl                         → פינות מעוגלות
- opacity-50                         → שקיפות 50% (מעומעם)
```

---

## 9. כרטיס סט פעיל | Active Set Card

### `.active-set-card`
**תיאור:** כרטיס הסט הפעיל (המודגש)
```css
- relative                           → מיקום יחסי לתג המספר
- p-4                                → ריפוד 1rem
- rounded-xl                         → פינות מעוגלות
- border-2 border-neon-cyan          → מסגרת טורקיז עבה
- bg-neon-gray-800/50                → רקע אפור חצי-שקוף
```

### `.active-set-header`
**תיאור:** כותרת סוג הסט
```css
- flex items-center justify-between  → פריסה אופקית
- px-3 py-2                          → ריפוד
- -mx-4 -mt-4 mb-4                   → מרג'ין שלילי להצמדה לקצוות
- bg-neon-gray-700                   → רקע אפור
- rounded-t-xl                       → פינות מעוגלות למעלה בלבד
```

### `.active-set-fields`
**תיאור:** אזור שדות ההזנה
```css
- flex items-stretch justify-around  → פריסה שווה
- mb-4                               → מרג'ין תחתון
```

### `.active-set-field`
**תיאור:** שדה הזנה בודד
```css
- flex flex-col items-center         → עמודה ממורכזת
```

### `.active-set-divider`
**תיאור:** קו מפריד בין שדות
```css
- w-px                               → רוחב 1px
- bg-neon-gray-600                   → צבע אפור
```

### `.active-set-input-group`
**תיאור:** קבוצת קלט (- ערך +)
```css
- flex items-center gap-2            → פריסה עם רווח
```

### `.active-set-btn`
**תיאור:** כפתורי +/-
```css
- w-10 h-10                          → גודל 2.5rem x 2.5rem
- rounded-lg                         → פינות מעוגלות
- flex items-center justify-center   → מרכוז האייקון
- bg-neon-gray-700                   → רקע אפור
- hover:bg-neon-gray-600             → רקע בהיר יותר בריחוף
- text-white                         → צבע לבן
- transition-colors                  → אנימציית מעבר
```

### `.active-set-value`
**תיאור:** תצוגת הערך (מספר)
```css
- text-2xl font-bold                 → גופן גדול ומודגש
- text-white                         → צבע לבן
- min-w-[60px]                       → רוחב מינימלי
- text-center                        → יישור למרכז
```

### `.active-set-badge`
**תיאור:** תג מספר הסט (פינה שמאלית)
```css
- absolute top-4 left-4              → מיקום בפינה שמאלית עליונה
- w-8 h-8                            → גודל 2rem x 2rem
- rounded-full                       → עיגול
- flex items-center justify-center   → מרכוז
- text-sm font-bold                  → גופן קטן ומודגש
- border-2 border-neon-cyan          → מסגרת טורקיז
- text-neon-cyan                     → טקסט טורקיז
```

### `.active-set-complete-btn`
**תיאור:** כפתור "סיים סט"
```css
- w-full                             → רוחב מלא
- py-3 mt-4                          → ריפוד ומרג'ין
- rounded-xl                         → פינות מעוגלות
- font-semibold                      → גופן מודגש
- bg-neon-gradient                   → גרדיאנט טורקיז-ירוק
- text-neon-dark                     → טקסט כהה
- flex items-center justify-center gap-2  → מרכוז עם אייקון
- hover:shadow-lg hover:shadow-neon-cyan/30  → צל בריחוף
- transition-all                     → אנימציית מעבר
```

---

## 10. טיימר מנוחה | Rest Timer

### `.rest-timer-container`
**תיאור:** מיכל הטיימר
```css
- py-6                               → ריפוד אנכי 1.5rem
```

### `.rest-timer-content`
**תיאור:** תוכן הטיימר (כפתורים + עיגול)
```css
- flex items-center justify-center   → מרכוז
- gap-8                              → רווח 2rem בין אלמנטים
```

### `.rest-timer-skip`
**תיאור:** כפתור "דלג"
```css
- flex items-center gap-1            → Flexbox עם רווח קטן
- text-white underline               → טקסט לבן מקווקו
- text-sm                            → גופן קטן
```

### `.rest-timer-circle-wrapper`
**תיאור:** עטיפת העיגול
```css
- relative                           → מיקום יחסי לתצוגת הזמן
```

### `.rest-timer-svg`
**תיאור:** אלמנט ה-SVG של העיגול
```css
- transform -rotate-90               → סיבוב 90° להתחלה מלמעלה
```

### `.rest-timer-display`
**תיאור:** תצוגת הזמן במרכז העיגול
```css
- absolute inset-0                   → מכסה את כל העיגול
- flex items-center justify-center   → מרכוז הטקסט
```

### `.rest-timer-target`
**תיאור:** כפתור זמן היעד
```css
- flex items-center gap-1            → Flexbox עם רווח
- text-neon-gray-400                 → צבע אפור
- text-sm                            → גופן קטן
```

### `.rest-timer-selector-backdrop`
**תיאור:** רקע מודל בחירת זמן
```css
- fixed inset-0 z-50                 → מסך מלא
- bg-black/80                        → רקע שחור 80%
- flex items-center justify-center   → מרכוז
- p-4                                → ריפוד
```

### `.rest-timer-selector`
**תיאור:** מודל בחירת זמן מנוחה
```css
- bg-neon-gray-900                   → רקע כהה
- rounded-2xl                        → פינות מעוגלות מאוד
- p-6                                → ריפוד 1.5rem
- w-full max-w-xs                    → רוחב מקסימלי 20rem
- border border-neon-gray-700        → מסגרת אפורה
```

---

## 11. סרגל תחתון | Bottom Bar

### `.workout-session-bottom`
**תיאור:** סרגל תחתון קבוע
```css
- fixed bottom-0 left-0 right-0      → קבוע בתחתית
- p-4                                → ריפוד 1rem
- bg-neon-gray-900                   → רקע כהה
- border-t border-neon-gray-800      → קו עליון
```

---

## 12. צבעים בשימוש | Colors Used

| שם | ערך | שימוש |
|-----|-----|--------|
| `neon-dark` | #0a0a0a | רקע ראשי |
| `neon-gray-900` | #171717 | רקע כותרות |
| `neon-gray-800` | #262626 | רקע כרטיסים |
| `neon-gray-700` | #404040 | רקע כפתורים |
| `neon-gray-600` | #525252 | קווים מפרידים |
| `neon-gray-500` | #737373 | טקסט מעומעם |
| `neon-gray-400` | #a3a3a3 | טקסט משני |
| `neon-cyan` | #22d3ee | צבע ראשי (Accent) |
| `coral` | #FF6B6B | צבע טיימר |

---

## 13. נקודות חשובות

1. **RTL Support** - כל הסגנונות תומכים בכיוון ימין-לשמאל
2. **Mobile First** - כל הגדלים מותאמים לנייד
3. **Dark Theme** - כל הצבעים מותאמים לערכת נושא כהה
4. **Accessibility** - גדלי לחיצה מינימליים של 40x40px
5. **Transitions** - כל האינטראקציות עם אנימציות חלקות
