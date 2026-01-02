# 🤖 הנחיות פיתוח לסוכן Claude Code - פרויקט GymIQ

## 🎯 עקרונות פיתוח עליונים

אתה מפתח מערכת כושר מתקדמת **מהתחלה**. היעד הוא ליצור מוצר production-ready עם ארכיטקטורה סופית ומושלמת, לא POC או דמו.

---

## 🏗️ גישת הפיתוח

### 1. ארכיטקטורה ראשית (Architecture First)
```
🔧 תכנן לפני שכותב
📐 ארכיטקטורה מודולרית וניתנת להרחבה
🔄 Design Patterns מבוססים (Repository, Service Layer, Factory)
📦 ארגון קבצים לפי domain/feature, לא לפי סוג
```

### 2. קוד נקי ומקצועי (Clean Code)
```
✨ SOLID Principles
🧪 Test-Driven Development (TDD)
📝 Documentation מובנית
🔍 TypeScript מלא עם types מדויקים
```

### 3. ביצועים ואופטימיזציה (Performance First)
```
⚡ Lazy Loading לכל component
🗄️ State Management מבוקר (Redux Toolkit או Zustand)
🎯 React.memo ו-useMemo איפה שצריך
📊 Bundle splitting ו-code optimization
```

---

## 📁 מבנה מערכת (System Architecture)

### מבנה תיקיות בפועל (Actual Structure)
```
src/
├── 📦 domains/                 # Business domains (Feature-based)
│   ├── admin/                  # Admin panel
│   │   └── components/         # ExerciseForm, UsersList, etc.
│   ├── authentication/         # User auth domain
│   │   ├── components/         # LoginPage, RegisterPage
│   │   ├── hooks/              # useAuth
│   │   └── services/           # authService
│   ├── workouts/              # Workout management domain
│   │   ├── components/         # WorkoutBuilder, WorkoutSession
│   │   ├── store/              # workoutBuilderStore (Zustand)
│   │   └── types/              # workout.types.ts, active-workout.types.ts
│   └── exercises/             # Exercise library domain
│       ├── components/         # ExerciseLibrary, ExerciseCard
│       ├── services/           # exerciseService
│       └── types/              # Exercise, MuscleGroup types
│
├── 🔧 lib/                     # Shared libraries
│   └── firebase/               # Firebase config & services
│
├── 📱 pages/                   # Route pages (legacy)
│
├── 🎨 styles/                  # Global styles
│   └── index.css               # CSS custom properties
│
├── App.tsx                     # Root component with routes
└── main.tsx                    # Entry point
```

### קבצי שורש חשובים
```
/
├── tailwind.config.js          # 🎨 מקור האמת לצבעים ועיצוב
├── index.css (src/)            # CSS custom properties
└── .env                        # Firebase credentials
```

---

## 🎨 Design System Guidelines

### ⚠️ כלל קריטי: ריכוז עיצוב במקום אחד

**אסור לפתח סגנונות מקומיים בקומפוננטים!**

כל הגדרות העיצוב חייבות להיות במקום מרוכז אחד:

```
📍 מקורות האמת לעיצוב (Design Token Sources):

1. tailwind.config.js     → הגדרות צבעים, ריווחים, גדלים
2. src/index.css          → CSS custom properties (--neon-cyan, etc.)
3. Tailwind classes       → שימוש ב-classes מוגדרים בלבד

❌ אסור:
- inline styles עם צבעים קשיחים
- הגדרת צבעים חדשים בתוך קומפוננט
- שכפול הגדרות עיצוב בין קבצים
- יצירת קבצי CSS מקומיים לקומפוננטים

✅ חובה:
- שימוש אך ורק ב-classes מ-tailwind.config.js
- הוספת צבעים/סגנונות חדשים רק ב-tailwind.config.js
- שימוש ב-CSS variables דרך var(--neon-cyan) וכדומה
```

### סכמת צבעים פעילה
```javascript
// מוגדר ב-tailwind.config.js
colors: {
  'neon-dark': '#0a0a0f',
  'neon-cyan': '#00f5ff',
  'neon-pink': '#ff00ff',
  'neon-gray': {
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
}

// שימוש נכון בקומפוננטים:
className="bg-neon-dark text-neon-cyan border-neon-gray-700"
```

### עקרונות עיצוב
```typescript
// ❌ אסור - קודי צבעים בקומפוננט
<div style={{ backgroundColor: '#00f5ff' }}>
<div className="bg-[#00f5ff]">

// ✅ נכון - שימוש ב-design tokens מ-tailwind
<div className="bg-neon-cyan text-neon-dark">

// ✅ נכון - שימוש ב-CSS variables
<div style={{ color: 'var(--neon-cyan)' }}>
```

### מבנה Design System
1. **Tokens** - מוגדרים ב-tailwind.config.js בלבד
2. **CSS Variables** - מוגדרים ב-src/index.css בלבד
3. **Tailwind Classes** - שימוש בקומפוננטים
4. **Theme** - Dark mode בלבד (אין light mode כרגע)

---

## 🔐 אבטחה ו-Infrastructure

### הנחיות אבטחה קריטיות
```bash
# Environment Variables (חובה!)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_APP_VERSION=
VITE_APP_ENVIRONMENT=development|staging|production
```

### Firebase Configuration
```typescript
// ✅ נכון - configuration מבוקר
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  // לעולם לא לחשוף sensitive data!
}

// כללי Firestore - תמיד מאובטחים!
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // כל גישה דורשת אימות
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📊 State Management Strategy

### בחירת כלי State Management
```typescript
// אפליקציות קטנות/בינוניות - Context + useReducer
// אפליקציות גדולות - Redux Toolkit או Zustand

// מבנה Store מומלץ:
interface AppState {
  auth: AuthState;
  workouts: WorkoutState;
  exercises: ExerciseState;
  ui: UIState;
  settings: SettingsState;
}
```

---

## 🧪 Testing Strategy

### מבנה בדיקות
```
__tests__/
├── unit/              # Unit tests לפונקציות
├── integration/       # Integration tests לקומפוננטים
├── e2e/              # End-to-end tests
└── __mocks__/        # Mock files
```

### כלי בדיקה נדרשים
- **Vitest** - Unit testing
- **React Testing Library** - Component testing  
- **MSW** - API mocking
- **Playwright** - E2E testing

---

## 🚀 Build & Deployment Strategy

### Build Configuration
```typescript
// vite.config.ts - מוכן לייצור
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/firestore'],
          ui: ['@design-system/components']
        }
      }
    }
  },
  // PWA support
  plugins: [react(), VitePWA()]
});
```

---

## 📝 Documentation Requirements

### מסמכים נדרשים לכל feature
1. **README.md** - סקירה והתקנה
2. **ARCHITECTURE.md** - תיאור הארכיטקטורה
3. **API.md** - תיעוד API endpoints
4. **DEPLOYMENT.md** - הנחיות deployment
5. **CHANGELOG.md** - רשימת שינויים

---

## 🎯 Quality Gates (שערי איכות)

### לפני כל commit
- [ ] TypeScript compiles ללא errors
- [ ] כל הבדיקות עוברות
- [ ] Code coverage > 80%
- [ ] ESLint + Prettier passed
- [ ] Performance budget לא נחרג

### לפני production deploy
- [ ] Security audit passed
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Backup strategy verified

---

## 🔄 Development Workflow

### Git Strategy
```bash
main/           # Production code
develop/        # Development branch
feature/*       # Feature branches
release/*       # Release branches
hotfix/*        # Critical fixes
```

### Code Review Checklist
- [ ] עקרונות SOLID מיושמים
- [ ] Components מחולקים נכון
- [ ] אין code duplication
- [ ] Performance optimized
- [ ] Security validated
- [ ] Accessibility tested

---

## ⚡ Performance Budgets

### מגבלות ביצועים
- **Initial bundle size**: < 100KB gzipped
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Memory usage**: < 50MB on mobile

---

## 🎨 UI/UX Guidelines

### עקרונות עיצוב
- **Mobile-first responsive design**
- **Dark/Light theme support**
- **RTL/LTR support מלא**
- **Accessibility (WCAG 2.1 AA)**
- **Progressive Web App (PWA)**

### Animation Guidelines
```css
/* Fast animations for micro-interactions */
transition: all 0.15s ease-out;

/* Slower for layout changes */
transition: all 0.3s ease-in-out;

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
}
```

---

## 📋 Next Steps

1. **הגדר את מבנה הפרויקט** לפי המבנה המפורט
2. **התקן את Design System** עם tokens בסיסיים
3. **הגדר Firebase** עם אבטחה מלאה
4. **צור base components** עם TypeScript מלא
5. **הכן testing environment**

**זכור**: כל קווי קוד שתכתוב צריך להיות production-ready ובאיכות גבוהה!

---

*"האיכות אינה מקרה - היא תמיד תוצאה של מאמץ מרוכז"*