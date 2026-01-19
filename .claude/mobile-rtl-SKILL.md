---
name: gymiq-mobile-rtl
description: "Specialized mobile-first and Hebrew RTL development for GymIQ. Handles responsive design, touch targets, and right-to-left layout requirements. Use when working on UI components, responsive layouts, or Hebrew text display."
---

# GymIQ Mobile & RTL Development

**מתי להפעיל:** כשעובדים על רכיבי UI, עיצוב רספונסיבי, תצוגת טקסט עברי, או בדיקות מובייל

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

## Design Tokens (Tailwind)

> **כל הצבעים והסגנונות מוגדרים ב-`tailwind.config.js`**

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
  'text-muted': '#6B7280',     // טקסט משני
}
```

### שימוש נכון:
```jsx
// ✅ נכון - שימוש ב-tokens
<div className="bg-dark-card text-text-primary">
<span className="text-accent-orange">

// ❌ לא נכון - צבעים hardcoded
<div style={{ background: '#1A1A1A' }}>
<span className="text-orange-500">
```

### קובץ סגנונות מרכזי:
- צבעים: `tailwind-tokens.js`
- CSS גלובלי: `src/index.css`
- קלאסים מותאמים: `.btn-neon`, `.input-neon`, `.badge-last-workout`

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

## Common Issues

### Avoid These Patterns
```jsx
// ❌ Fixed positioning without RTL consideration
<div className="absolute left-4 top-4">

// ❌ Hardcoded margins
<div className="ml-4">

// ✅ RTL-aware spacing  
<div className="mr-4 rtl:ml-4 rtl:mr-0">
```

### Safe Patterns
- Use Tailwind's RTL variants: `rtl:text-left`
- Prefer logical properties: `ps-4` (padding-inline-start)
- Test on actual device when possible

This skill ensures GymIQ provides excellent mobile experience for Hebrew-speaking fitness enthusiasts.
