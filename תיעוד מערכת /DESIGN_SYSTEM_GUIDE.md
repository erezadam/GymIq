# 🎨 הנחיות לעדכון מערכת העיצוב - GymIQ

## ⚠️ כלל עליון - חובה לקרוא!

**עדכן אך ורק את קובץ ה-Tokens הראשי:**
```
src/theme/tokens.ts
```

**אסור בהחלט** לכתוב ערכי עיצוב (צבעים, גדלים, צללים) ישירות בקומפוננטות.
אם אתה מגלה עיצוב hardcoded בקוד - **תקן אותו מיד** והפנה ל-tokens.

---

## 📁 מבנה הקבצים

```
src/theme/
├── tokens.ts          ← 🎯 הקובץ היחיד לעדכון עיצוב
├── components/
│   ├── Button3D.tsx   ← קורא מ-tokens בלבד
│   ├── Card.tsx       ← קורא מ-tokens בלבד
│   ├── ActionCard.tsx ← קורא מ-tokens בלבד
│   └── StatCard.tsx   ← קורא מ-tokens בלבד
└── index.ts           ← מייצא הכל
```

---

## 🎨 קובץ tokens.ts - המקור היחיד לאמת

```typescript
// src/theme/tokens.ts

export const tokens = {
  // ===== COLORS =====
  colors: {
    background: {
      main: '#0B0D12',       // רקע ראשי
      card: '#141820',       // כרטיסים
      elevated: '#1A1F2A',   // רקע מוגבה
    },
    
    primary: {
      main: '#00D4AA',
      gradient: 'linear-gradient(135deg, #00B894 0%, #00D4AA 50%, #00E5B8 100%)',
    },
    
    secondary: {
      main: '#1E2330',
      light: '#252B3A',
      dark: '#14181F',
    },
    
    accent: {
      orange: '#FF6B35',     // מסגרת זוהרת לפעולות ראשיות
      gold: '#C4A052',
      cyan: '#00D4AA',
    },
    
    text: {
      primary: '#FFFFFF',
      secondary: '#8B95A5',
      muted: '#5A6478',
    },
    
    border: {
      default: '#1E2430',
      light: '#2A3142',
    },
  },
  
  // ===== SPACING =====
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  
  // ===== BORDER RADIUS =====
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  
  // ===== SHADOWS =====
  shadows: {
    button: {
      default: '0 4px 0 #0A0C10, 0 8px 16px rgba(0, 0, 0, 0.5)',
      pressed: '0 1px 0 #0A0C10, 0 2px 4px rgba(0, 0, 0, 0.4)',
    },
    card: '0 6px 24px rgba(0, 0, 0, 0.5)',
    glow: {
      orange: '0 0 12px rgba(255, 107, 53, 0.5), 0 0 24px rgba(255, 107, 53, 0.3)',
      cyan: '0 0 12px rgba(0, 212, 170, 0.5)',
    },
  },
};
```

---

## ✅ דוגמה נכונה - קומפוננטה קוראת מ-tokens

```typescript
// src/theme/components/Button3D.tsx
import { tokens } from '../tokens';

export const Button3D = ({ glowBorder = false, ...props }) => {
  return (
    <button
      style={{
        // ✅ נכון - קורא מ-tokens
        background: `linear-gradient(180deg, ${tokens.colors.secondary.light} 0%, ${tokens.colors.secondary.main} 100%)`,
        border: glowBorder 
          ? `2px solid ${tokens.colors.accent.orange}` 
          : `1px solid ${tokens.colors.border.light}`,
        borderRadius: tokens.borderRadius.lg,
        boxShadow: glowBorder
          ? `${tokens.shadows.button.default}, ${tokens.shadows.glow.orange}`
          : tokens.shadows.button.default,
      }}
    >
      {props.children}
    </button>
  );
};
```

---

## ❌ דוגמה שגויה - אסור!

```typescript
// ❌ אסור! עיצוב hardcoded
<button
  style={{
    background: '#1E2330',           // ❌ צבע ישיר
    border: '2px solid #FF6B35',     // ❌ צבע ישיר
    borderRadius: '16px',            // ❌ גודל ישיר
    boxShadow: '0 4px 0 #0A0C10',    // ❌ צל ישיר
  }}
>

// ❌ אסור! Tailwind classes עם ערכים
<div className="bg-[#141820] rounded-[16px] border-[#2A3142]">
```

---

## 🔍 כשמגלים עיצוב hardcoded - תקן כך:

### לפני (שגוי):
```typescript
<div style={{ backgroundColor: '#141820', borderRadius: '16px' }}>
```

### אחרי (נכון):
```typescript
import { tokens } from '@/theme/tokens';

<div style={{ 
  backgroundColor: tokens.colors.background.card, 
  borderRadius: tokens.borderRadius.xl 
}}>
```

---

## 📋 רשימת בדיקה לסוכן

בכל פעם שאתה עובד על קוד:

- [ ] האם יש צבעים כתובים ישירות? (כמו `#FFFFFF`, `rgba(...)`) → **תקן!**
- [ ] האם יש גדלים כתובים ישירות? (כמו `16px`, `1rem`) → **תקן!**
- [ ] האם יש צללים כתובים ישירות? → **תקן!**
- [ ] האם יש border-radius כתוב ישירות? → **תקן!**
- [ ] האם כל הקומפוננטות מייבאות מ-tokens? → **אם לא, תקן!**

---

## 🎯 עקרונות עיצוב GymIQ

### כפתורים ראשיים (פעולות חשובות):
- רקע: אפור/שחור (כמו כפתורים רגילים)
- מסגרת: `2px solid ${tokens.colors.accent.orange}`
- זוהר: `${tokens.shadows.glow.orange}`

### כפתורים משניים:
- רקע: gradient אפור
- מסגרת: `1px solid ${tokens.colors.border.light}`
- ללא זוהר

### כרטיסים:
- רקע: `tokens.colors.background.card`
- מסגרת: `1px solid ${tokens.colors.border.default}`
- צל: `tokens.shadows.card`

### כרטיס פעולה ראשית:
- אותו רקע כמו כרטיס רגיל
- מסגרת כתומה זוהרת: `2px solid ${tokens.colors.accent.orange}`
- זוהר: `${tokens.shadows.glow.orange}`

### טקסט:
- כותרות: `tokens.colors.text.primary` (לבן) + fontWeight: 700-800
- משני: `tokens.colors.text.secondary`
- מושתק: `tokens.colors.text.muted`

---

## 🔄 תהליך עבודה

1. **לפני שינוי עיצוב** → פתח את `tokens.ts`
2. **עדכן את הערך ב-tokens** → שמור
3. **וודא שהקומפוננטות קוראות מ-tokens** → אם לא, תקן
4. **בדוק שאין hardcoded values** → אם יש, תקן

---

## ⚡ סיכום

| פעולה | נכון | שגוי |
|-------|------|------|
| שינוי צבע | עדכן tokens.ts | לכתוב ישירות בקומפוננטה |
| הוספת צבע חדש | הוסף ל-tokens.ts | לכתוב ישירות |
| שימוש בצבע | `tokens.colors.X` | `'#FFFFFF'` |
| שימוש בגודל | `tokens.spacing.X` | `'16px'` |

**זכור: קובץ tokens.ts הוא המקור היחיד לאמת!**
