---
name: gymiq-mobile-rtl
description: "Specialized mobile-first and Hebrew RTL development for GymIQ. Handles responsive design, touch targets, and right-to-left layout requirements. Use when working on UI components, responsive layouts, or Hebrew text display."
---

# GymIQ Mobile & RTL Development

**מתי להפעיל:** כשעובדים על רכיבי UI, עיצוב רספונסיבי, תצוגת טקסט עברי, או בדיקות מובייל

---

## 🚨 חוק ברזל: NO INLINE STYLES

> **רקע:** ב-29/01/2026 נמצאו 217 שימושים ב-`style={{}}` ב-12 קבצים.
> הפרויקט מגדיר Design System ב-`tailwind-tokens.js` - חובה להשתמש בו!

### ❌ אסור בתכלית האיסור:

```jsx
// ❌ לעולם לא ככה!
<div style={{ color: '#A855F7' }}>
<div style={{ background: 'rgba(168, 85, 247, 0.1)' }}>
<div style={{ display: 'flex', gap: '8px', padding: '12px' }}>
<div style={{ fontSize: '14px', fontWeight: 'bold' }}>
<div style={{ border: '1px solid rgba(168, 85, 247, 0.3)' }}>
```

### ✅ חובה - להשתמש ב-Tailwind classes:

```jsx
// ✅ נכון - Tailwind classes
<div className="text-purple-500">
<div className="bg-purple-500/10">
<div className="flex gap-2 p-3">
<div className="text-sm font-bold">
<div className="border border-purple-500/30">
```

### 📋 טבלת המרה מהירה:

| Inline Style | Tailwind Class |
|--------------|----------------|
| `color: '#A855F7'` | `text-purple-500` |
| `color: '#EF4444'` | `text-red-500` |
| `color: '#9CA3AF'` | `text-gray-400` |
| `color: '#2DD4BF'` | `text-teal-400` |
| `background: 'rgba(168, 85, 247, 0.1)'` | `bg-purple-500/10` |
| `background: 'rgba(239, 68, 68, 0.1)'` | `bg-red-500/10` |
| `display: 'flex'` | `flex` |
| `flexDirection: 'column'` | `flex-col` |
| `gap: '8px'` | `gap-2` |
| `gap: '12px'` | `gap-3` |
| `padding: '8px'` | `p-2` |
| `padding: '12px'` | `p-3` |
| `padding: '16px'` | `p-4` |
| `fontSize: '12px'` | `text-xs` |
| `fontSize: '14px'` | `text-sm` |
| `fontSize: '16px'` | `text-base` |
| `fontWeight: 'bold'` | `font-bold` |
| `fontWeight: '500'` | `font-medium` |
| `borderRadius: '4px'` | `rounded` |
| `borderRadius: '8px'` | `rounded-lg` |
| `border: '1px solid ...'` | `border border-[color]` |
| `cursor: 'pointer'` | `cursor-pointer` |
| `transition: '...'` | `transition-all` |

### 🎨 צבעי הפרויקט (מתוך tailwind-tokens.js):

```
# צבעים ראשיים - להשתמש רק באלה!
primary.main: #00D4AA  → text-primary / bg-primary
accent.purple: #8B5CF6 → text-purple-500 / bg-purple-500
status.error: #EF4444  → text-red-500 / bg-red-500
status.warning: #F59E0B → text-amber-500 / bg-amber-500
status.success: #10B981 → text-emerald-500 / bg-emerald-500

# צבעים שנמצאו בקוד אבל לא ב-tokens (לתקן!):
#A855F7 → להחליף ל-purple-500 (#8B5CF6)
#2DD4BF → להחליף ל-teal-400 או primary
```

### 🔍 בדיקה לפני commit:

```bash
# בדוק שאין inline styles חדשים:
grep -r "style={{" src/ --include="*.tsx" | wc -l

# אם המספר עלה - לתקן לפני commit!
```

### ⚠️ חריגים מותרים (נדירים מאוד):

1. **ערכים דינמיים שחייבים חישוב** - כמו `width` שמגיע מ-state
2. **אנימציות מורכבות** - שאי אפשר לבטא ב-Tailwind
3. **תאימות לספריות צד שלישי** - שדורשות inline

**בכל מקרה אחר - להשתמש ב-Tailwind!**

---

## Mobile-First Rules (90% Mobile Usage)

### Screen Sizes
- **Primary**: 375px width (iPhone SE/12 mini)
- **Secondary**: 390px width (iPhone 12/13)
- **Desktop**: 1024px+ (10% usage)

### Touch Targets
- Minimum 44x44px (iOS guideline)
- Spacing between interactive elements: 8px minimum
- Buttons in active workout: 48x48px minimum

### Layout Checks
```bash
# Test in DevTools
1. Set to 375px width
2. Check for horizontal scroll
3. Verify all buttons are reachable
4. Test touch interactions
```

---

## Hebrew RTL Implementation

### Text Direction
```css
/* Automatic RTL support */
html[dir="rtl"] {
  /* Tailwind handles most RTL automatically */
}
```

### Icon Positioning
- Back arrows: right side of headers
- Menu icons: left side alignment  
- Action buttons: maintain visual hierarchy

### Flexbox RTL
```jsx
// Correct RTL flex layout
<div className="flex flex-row-reverse items-center">
  <BackButton />
  <Title />
</div>
```

---

## Design Tokens (Tailwind)

> **כל הצבעים והסגנונות מוגדרים ב-`tailwind.config.js` ו-`tailwind-tokens.js`**

### צבעים עיקריים:
```javascript
// מתוך tailwind-tokens.js
colors: {
  'primary-400': '#60A5FA',    // כחול ראשי
  'accent-orange': '#F97316',  // כתום הדגשה
  'dark-bg': '#0A0A0A',        // רקע כהה
  'dark-surface': '#141414',   // משטח
  'dark-card': '#1A1A1A',      // כרטיס
  'text-primary': '#FFFFFF',   // טקסט ראשי
  // Material 3 Surface tokens (23/03/2026):
  'surface-container': '#1d2026',
  'on-surface': '#e1e2eb',           // טקסט ראשי על surface
  'on-surface-variant': '#bbcac6',   // טקסט משני על surface (מחליף text-muted)
}
```

### שימוש נכון:
```jsx
// ✅ נכון - שימוש ב-tokens
<div className="bg-dark-card text-text-primary">
<span className="text-accent-orange">
<p className="text-on-surface-variant">  // טקסט משני/מושתק

// ❌ לא נכון - צבעים hardcoded
<div style={{ background: '#1A1A1A' }}>
<span className="text-orange-500">

// ❌ לא נכון - tokens ישנים (הוחלפו ב-23/03/2026)
<span className="text-text-muted">     // → text-on-surface-variant
<span className="text-text-secondary">  // → text-on-surface-variant
```

### קובץ סגנונות מרכזי:
- צבעים: `tailwind-tokens.js`
- CSS גלובלי: `src/index.css`
- קלאסים מותאמים: `.btn-neon`, `.input-neon`, `.badge-last-workout`

---

## Component Guidelines

### Headers
```jsx
// Mobile header pattern
<header className="sticky top-0 z-10 bg-white border-b">
  <div className="flex items-center justify-between px-4 py-3">
    <BackButton />
    <h1 className="text-lg font-semibold">כותרת</h1>
    <ActionButton />
  </div>
</header>
```

### Form Inputs
```jsx
// RTL form input
<input 
  dir="rtl" 
  className="w-full text-right px-3 py-2"
  placeholder="הכנס טקסט..."
/>
```

---

## Testing Protocol

### Mobile Verification
1. **Layout**: No horizontal scroll at 375px
2. **Touch**: All interactive elements 44x44px+
3. **Typography**: Text remains readable
4. **Navigation**: Smooth thumb navigation

### RTL Verification  
1. **Text Flow**: Right-to-left reading order
2. **Icons**: Directionally appropriate
3. **Forms**: Right-aligned inputs
4. **Navigation**: Logical flow direction

### Styling Verification (חדש!)
1. **No inline styles**: `grep -r "style={{" src/ --include="*.tsx"` returns 0 new instances
2. **Colors from tokens**: All colors exist in `tailwind-tokens.js`
3. **Consistent spacing**: Using Tailwind spacing scale (p-2, gap-3, etc.)

---

## Common Issues

### Avoid These Patterns
```jsx
// ❌ Fixed positioning without RTL consideration
<div className="absolute left-4 top-4">

// ❌ Hardcoded margins
<div className="ml-4">

// ❌ Inline styles (הכי חשוב!)
<div style={{ color: '#A855F7', padding: '12px' }}>

// ✅ RTL-aware spacing  
<div className="mr-4 rtl:ml-4 rtl:mr-0">

// ✅ Tailwind classes
<div className="text-purple-500 p-3">
```

### Safe Patterns
- Use Tailwind's RTL variants: `rtl:text-left`
- Prefer logical properties: `ps-4` (padding-inline-start)
- Test on actual device when possible
- **Always use Tailwind classes, never inline styles**

---

## צ'קליסט לפני סיום משימת UI

```
□ אין inline styles חדשים (בדיקת grep)
□ כל הצבעים מתוך tailwind-tokens.js
□ נבדק על 375px width
□ כל כפתור לפחות 44x44px
□ RTL תקין - טקסט וכיוונים
□ אין horizontal scroll
```

---

This skill ensures GymIQ provides excellent mobile experience for Hebrew-speaking fitness enthusiasts, with consistent styling through the Design System.
