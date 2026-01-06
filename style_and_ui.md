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
