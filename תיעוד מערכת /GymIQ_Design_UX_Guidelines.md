# 🎨 GymIQ Design System & UX Guidelines

## 🌈 צבעי המותג (Brand Colors)

### פלטת צבעים עיקרית (מבוססת על התמונה)
```typescript
const brandColors = {
  // Primary Blues (כחולים עיקריים)
  primary: {
    50: '#E6F7FF',   // כחול בהיר מאוד
    100: '#BAE7FF',  // כחול בהיר
    200: '#7DD3FC',  // כחול בינוני בהיר
    300: '#38BDF8',  // כחול בינוני
    400: '#0EA5E9',  // כחול ברירת מחדל
    500: '#0284C7',  // כחול כהה
    600: '#0369A1',  // כחול כהה יותר
    700: '#1E40AF',  // כחול עמוק
    800: '#1E3A8A',  // כחול עמוק מאוד
    900: '#1E293B'   // כחול כמעט שחור
  },

  // Accent Greens/Cyan (ירוקים/ציאן להדגשות)
  accent: {
    50: '#ECFDF5',   // ירוק בהיר מאוד
    100: '#A7F3D0',  // ירוק בהיר
    200: '#6EE7B7',  // ירוק-ציאן בהיר
    300: '#34D399',  // ירוק-ציאן בינוני
    400: '#10B981',  // ירוק-ציאן ברירת מחדל
    500: '#059669',  // ירוק-ציאן כהה
    600: '#047857',  // ירוק כהה
    700: '#065F46',  // ירוק עמוק
    800: '#064E3B',  // ירוק עמוק מאוד
    900: '#022C22'   // ירוק כמעט שחור
  },

  // Neon Effects (אפקטי נאון)
  neon: {
    blue: '#00BFFF',      // כחול נאון
    cyan: '#00FFFF',      // ציאן נאון
    green: '#00FF7F',     // ירוק נאון
    purple: '#8A2BE2',    // סגול נאון
    glow: 'rgba(0, 191, 255, 0.5)' // זוהר כחול
  },

  // Background & Surfaces (רקעים ומשטחים)
  dark: {
    bg: '#0F172A',        // רקע כהה עיקרי
    surface: '#1E293B',   // משטח כהה
    card: '#334155',      // כרטיסיה כהה
    border: '#475569'     // גבול כהה
  },

  // Text Colors (צבעי טקסט)
  text: {
    primary: '#F8FAFC',   // טקסט עיקרי (לבן)
    secondary: '#CBD5E1', // טקסט משני (אפור בהיר)
    muted: '#64748B',     // טקסט מושתק (אפור)
    accent: '#00BFFF'     // טקסט הדגשה (כחול נאון)
  }
};
```

### Gradient Definitions (הגדרות מעברי צבע)
```css
:root {
  /* Primary Gradients */
  --gradient-primary: linear-gradient(135deg, #0EA5E9 0%, #10B981 100%);
  --gradient-secondary: linear-gradient(135deg, #1E40AF 0%, #059669 100%);
  
  /* Neon Gradients */
  --gradient-neon: linear-gradient(135deg, #00BFFF 0%, #00FF7F 100%);
  --gradient-glow: linear-gradient(135deg, 
    rgba(0, 191, 255, 0.8) 0%, 
    rgba(16, 185, 129, 0.8) 100%
  );
  
  /* Background Gradients */
  --gradient-bg: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
  --gradient-card: linear-gradient(135deg, #1E293B 0%, #334155 100%);
}
```

---

## 🎯 Authentication Flow (זרימת הזדהות)

> **הערה:** המימוש הנוכחי משתמש באימות **Email + Password** דרך Firebase Auth.
> תכנון עתידי כולל גם Phone OTP.

### User Registration Flow - מימוש נוכחי
```typescript
interface RegistrationFlow {
  step1: {
    title: "הרשמה ל-GymIQ";
    subtitle: "צור חשבון חדש";
    fields: [
      {
        name: "email";
        label: "אימייל";
        placeholder: "your@email.com";
        type: "email";
        required: true;
        validation: "Valid email format";
      },
      {
        name: "password";
        label: "סיסמה";
        placeholder: "הזינו סיסמה";
        type: "password";
        required: true;
        validation: "Minimum 6 characters";
      },
      {
        name: "displayName";
        label: "שם מלא";
        placeholder: "השם שלכם";
        type: "text";
        required: true;
      }
    ];
    primaryAction: "הרשמה";
    secondaryAction: "יש לי חשבון - התחברות";
  };
}

interface LoginFlow {
  step1: {
    title: "התחברות ל-GymIQ";
    subtitle: "הזינו את פרטי החשבון";
    fields: [
      {
        name: "email";
        label: "אימייל";
        placeholder: "your@email.com";
        type: "email";
        required: true;
      },
      {
        name: "password";
        label: "סיסמה";
        placeholder: "הזינו סיסמה";
        type: "password";
        required: true;
      }
    ];
    primaryAction: "התחברות";
    secondaryAction: "אין לי חשבון - הרשמה";
    forgotPassword: "שכחתי סיסמה";
  };
}

// Firebase Auth Methods בשימוש:
// - createUserWithEmailAndPassword(email, password)
// - signInWithEmailAndPassword(email, password)
// - signOut()
// - onAuthStateChanged(callback)
```

---

## 🎨 Visual Design Elements

### Neon Glow Effects
```css
/* Neon Button Effects */
.neon-button {
  background: linear-gradient(135deg, #0EA5E9, #10B981);
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 16px 32px;
  font-weight: 600;
  color: white;
  position: relative;
  overflow: hidden;
  
  /* Glow effect */
  box-shadow: 
    0 0 20px rgba(0, 191, 255, 0.3),
    0 4px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  
  transition: all 0.3s ease;
}

.neon-button:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 0 30px rgba(0, 191, 255, 0.5),
    0 8px 30px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.neon-button:active {
  transform: translateY(0);
  box-shadow: 
    0 0 15px rgba(0, 191, 255, 0.3),
    0 2px 10px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Neon Input Fields */
.neon-input {
  background: rgba(30, 41, 59, 0.8);
  border: 2px solid rgba(71, 85, 105, 0.5);
  border-radius: 12px;
  padding: 16px 20px;
  font-size: 16px;
  color: #F8FAFC;
  transition: all 0.3s ease;
  
  backdrop-filter: blur(10px);
}

.neon-input:focus {
  outline: none;
  border-color: #00BFFF;
  box-shadow: 
    0 0 20px rgba(0, 191, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.neon-input::placeholder {
  color: #64748B;
}

/* Card with Neon Border */
.neon-card {
  background: linear-gradient(135deg, 
    rgba(30, 41, 59, 0.9) 0%, 
    rgba(51, 65, 85, 0.9) 100%
  );
  border: 2px solid rgba(0, 191, 255, 0.3);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  padding: 32px;
  
  box-shadow: 
    0 0 40px rgba(0, 191, 255, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Logo Glow Effect */
.logo-glow {
  filter: drop-shadow(0 0 20px rgba(0, 191, 255, 0.8));
  animation: pulse-glow 2s ease-in-out infinite alternate;
}

@keyframes pulse-glow {
  from {
    filter: drop-shadow(0 0 20px rgba(0, 191, 255, 0.8));
  }
  to {
    filter: drop-shadow(0 0 30px rgba(0, 191, 255, 1));
  }
}
```

---

## 📱 Mobile-First Components

### Phone Number Input Component
```typescript
interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  placeholder = "0547895818"
}) => {
  return (
    <div className="relative">
      <label className="block text-text-secondary text-sm font-medium mb-2">
        מספר טלפון
      </label>
      <div className="relative">
        <input
          type="tel"
          dir="ltr"
          className={`
            neon-input w-full text-right
            ${error ? 'border-red-500' : ''}
          `}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={10}
        />
        <PhoneIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-muted" />
      </div>
      {error && (
        <p className="text-red-400 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};
```

### Verification Code Input
```typescript
interface VerificationInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
}

const VerificationInput: React.FC<VerificationInputProps> = ({
  value,
  onChange,
  length = 6,
  error
}) => {
  return (
    <div className="space-y-4">
      <label className="block text-text-secondary text-sm font-medium text-center">
        קוד אימות
      </label>
      <div className="flex justify-center gap-2">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className={`
              w-12 h-12 text-center text-lg font-bold
              neon-input
              ${error ? 'border-red-500' : ''}
            `}
            value={value[i] || ''}
            onChange={(e) => {
              const newValue = value.split('');
              newValue[i] = e.target.value;
              onChange(newValue.join(''));
            }}
          />
        ))}
      </div>
      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}
    </div>
  );
};
```

---

## 🌟 Brand Elements

### Logo & Icon Guidelines
```typescript
const brandElements = {
  logo: {
    primary: "GymIQ logo with neon glow effect";
    sizes: ["24px", "32px", "48px", "64px", "128px"];
    variations: ["full-color", "white", "monochrome"];
  };

  iconography: {
    style: "rounded corners, neon outlines";
    weight: "medium to bold";
    library: "Lucide React + custom icons";
    effects: "subtle glow on interactive elements";
  };

  typography: {
    primary: "Inter (Hebrew: Rubik)";
    display: "Poppins (Hebrew: Assistant)";
    weights: [400, 500, 600, 700];
    rtlSupport: true;
  };
};
```

### Animation Principles
```css
/* Smooth transitions */
.smooth-transition {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Entrance animations */
.fade-in {
  animation: fadeIn 0.6s ease-out;
}

.slide-up {
  animation: slideUp 0.6s ease-out;
}

.scale-in {
  animation: scaleIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

@keyframes scaleIn {
  from { 
    opacity: 0; 
    transform: scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: scale(1); 
  }
}
```

---

## 📋 UX Guidelines

### Authentication UX Principles
1. **פשטות וברור** - הליך רישום/התחברות פשוט בן 2-3 שלבים
2. **משוב מיידי** - אינדיקציה ברורה על מצב השליחה והקבלה
3. **נגישות** - תמיכה RTL מלאה, גדלי פונט נגישים
4. **אבטחה** - אימות דו-שלבי עם SMS
5. **חוויה מהנה** - אנימציות חלקות ועיצוב מרשים

### Error States & Loading
```typescript
const uiStates = {
  loading: {
    phoneVerification: "שולח קוד אימות...";
    codeVerification: "מאמת קוד...";
    registration: "יוצר את החשבון שלכם...";
  };

  success: {
    codeSent: "קוד אימות נשלח בהצלחה!";
    verified: "האימות הושלם בהצלחה!";
    registered: "החשבון נוצר בהצלחה!";
  };

  errors: {
    invalidPhone: "מספר הטלפון אינו תקין";
    invalidCode: "קוד האימות שגוי";
    codeSendFailed: "שליחת הקוד נכשלה, נסו שנית";
    networkError: "בעיה בחיבור, אנא נסו שנית";
  };
};
```

### Responsive Design
```css
/* Mobile First Approach */
.auth-container {
  min-height: 100vh;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-bg);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  margin: auto;
}

@media (min-width: 768px) {
  .auth-container {
    padding: 40px;
  }
  
  .auth-card {
    max-width: 480px;
  }
}

@media (min-width: 1024px) {
  .auth-card {
    max-width: 520px;
  }
}
```

---

*העיצוב הזה ישמור על הזהות הוויזואלית המטריפה שלך ויספק חוויית משתמש מעולה!* ✨