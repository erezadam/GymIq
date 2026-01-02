# מפרט מסך אימון פעיל - GymIQ
## Workout Session Screen Specification

---

## 1. סקירה כללית | Overview

מסך זה מציג את מצב האימון הפעיל, כולל התרגיל הנוכחי, הסטים שהושלמו, הסט הפעיל, והסטים הבאים. המסך כולל גם טיימר מנוחה בין סטים.

**מטרת השינוי:** לעבור מעיצוב פשוט עם כפתורי +/- למסך מקצועי עם תצוגת סטים מרובדת, וידאו תרגיל, וטיימר מנוחה.

---

## 2. מבנה המסך | Screen Structure

```
┌─────────────────────────────────────────────┐
│  Header: Exercise Navigation                │
├─────────────────────────────────────────────┤
│  Exercise Name (teal)                       │
│  Exercise Instructions (white/gray)         │
├─────────────────────────────────────────────┤
│  Exercise Video/Image Thumbnail             │
│  (with play button overlay)                 │
├─────────────────────────────────────────────┤
│  Completed Sets List                        │
│  (scrollable if many sets)                  │
├─────────────────────────────────────────────┤
│  Current Active Set Card                    │
│  (highlighted with border)                  │
├─────────────────────────────────────────────┤
│  Upcoming Sets Preview                      │
│  (grayed out)                               │
├─────────────────────────────────────────────┤
│  Rest Timer Section                         │
│  (circular timer + skip button)             │
└─────────────────────────────────────────────┘
```

---

## 3. רכיבים מפורטים | Detailed Components

### 3.1 Header - ניווט תרגילים

```typescript
interface ExerciseNavigationHeader {
  // תצוגה: "תרגיל 1/7" במרכז
  currentExerciseIndex: number;
  totalExercises: number;
  
  // חיצים לניווט
  leftArrow: {
    icon: 'chevron-right'; // RTL - ימינה = קודם
    onClick: () => void; // navigateToPreviousExercise
    disabled: boolean; // true if first exercise
  };
  rightArrow: {
    icon: 'chevron-left'; // RTL - שמאלה = הבא
    onClick: () => void; // navigateToNextExercise
    disabled: boolean; // true if last exercise
  };
  
  // כפתור תפריט (3 נקודות)
  menuButton: {
    position: 'top-right';
    options: ['החלף תרגיל', 'דלג על תרגיל', 'הוסף הערה'];
  };
}
```

**עיצוב:**
- רקע: שקוף או `bg-gray-900`
- טקסט: לבן, גופן בינוני `text-lg font-medium`
- חיצים: צבע teal `text-teal-400`
- גובה: `h-14` (56px)

---

### 3.2 פרטי התרגיל | Exercise Details

```typescript
interface ExerciseDetails {
  name: string; // "היפ טראסט כנגד מוט"
  instructions?: string; // "לעבוד בשליטה ובטווח תנועה מלא"
}
```

**עיצוב:**
- שם תרגיל: 
  - צבע: `text-teal-400` (#2DD4BF או דומה)
  - גופן: `text-xl font-bold`
  - יישור: מרכז
- הוראות:
  - צבע: `text-gray-300`
  - גופן: `text-sm`
  - יישור: מרכז
- מרווח: `py-4`

---

### 3.3 וידאו/תמונת התרגיל | Exercise Media

```typescript
interface ExerciseMedia {
  type: 'video' | 'image';
  url: string;
  thumbnailUrl?: string;
  
  // אם וידאו - כפתור play במרכז
  playButton: {
    icon: 'play';
    size: 'large'; // ~60px
    backgroundColor: 'rgba(0,0,0,0.5)';
  };
}
```

**עיצוב:**
- גודל: רוחב מלא, גובה `h-48` או `aspect-video`
- פינות: `rounded-lg`
- מרווח: `mx-4 my-2`
- כפתור Play: עיגול עם אייקון play במרכז התמונה

**התנהגות:**
- לחיצה פותחת modal עם הוידאו/תמונה בגודל מלא
- אם אין וידאו - מציג את תמונת התרגיל מה-exercise library

---

### 3.4 רשימת סטים | Sets List

זהו הרכיב המרכזי והמורכב ביותר. מציג 3 סוגי סטים:

#### 3.4.1 סט שהושלם | Completed Set

```typescript
interface CompletedSetRow {
  setNumber: number;
  status: 'completed';
  
  // נתונים שהוזנו בפועל
  actualReps: number;
  actualWeight: number;
  actualRIR?: number;
  
  // עיצוב
  style: {
    backgroundColor: 'transparent';
    opacity: 1;
    numberBadge: {
      backgroundColor: 'bg-teal-500';
      textColor: 'white';
    };
  };
}
```

**עיצוב שורת סט שהושלם:**
```
┌─────────────────────────────────────────────────────┐
│  RIR 2  │  7 חזרות  │  85kg           (1)         │
└─────────────────────────────────────────────────────┘
```

- רקע: שקוף
- מפרידים: קו אנכי דק `border-r border-gray-600`
- Badge מספר סט: עיגול teal מלא עם מספר לבן
- יישור: RTL (מספר סט בצד שמאל)

---

#### 3.4.2 סט פעיל | Active Set

```typescript
interface ActiveSetCard {
  setNumber: number;
  status: 'active';
  
  // סוג הסט
  setType: {
    label: string; // "סוג הסט: סט רגיל"
    infoIcon: boolean; // true - מציג אייקון i
    onInfoClick?: () => void; // מציג הסבר על סוג הסט
  };
  
  // יעדים (מה שמאמן הגדיר)
  targets: {
    reps: {
      min: number; // 6
      max: number; // 8
      display: string; // "6 - 8"
    };
    weight: number; // 85
    rir?: number; // 1
  };
  
  // ערכים נוכחיים (מה שהמשתמש מזין)
  current: {
    reps: number;
    weight: number;
    rir?: number;
  };
  
  // הערה נוספת
  note?: string; // "משקל כולל המוט"
}
```

**עיצוב כרטיס סט פעיל:**
```
┌─────────────────────────────────────────────────────┐
│         סוג הסט: סט רגיל  ⓘ                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│   RIR    │    חזרות      │    משקל                 │
│   ___    │    6 - 8      │    85kg        (2)      │
│  (1rir)  │   (7reps)     │   (85kg)                │
│                                                     │
│              משקל כולל המוט                         │
└─────────────────────────────────────────────────────┘
```

**עיצוב מפורט:**
- מסגרת: `border-2 border-teal-500 rounded-xl`
- רקע: `bg-gray-800/50` (שקוף חלקית)
- כותרת סוג סט:
  - רקע: `bg-gray-700`
  - טקסט: `text-white text-sm`
  - אייקון info: `text-teal-400`
- שדות הזנה:
  - תווית עליונה: `text-gray-400 text-xs`
  - ערך יעד: `text-white text-lg font-bold`
  - ערך נוכחי בסוגריים: `text-gray-500 text-xs`
- Badge מספר סט: `border-2 border-teal-500` (לא מלא)
- הערה תחתונה: `text-gray-400 text-xs text-center`

**אינטראקציה:**
- לחיצה על שדה פותחת input לעריכה
- או: גלגול/swipe לשינוי ערך
- כפתור אישור סט בהמשך (או בטיימר)

---

#### 3.4.3 סט עתידי | Upcoming Set

```typescript
interface UpcomingSetRow {
  setNumber: number;
  status: 'upcoming';
  
  // יעדים (אם מוגדרים)
  targets?: {
    reps?: string;
    weight?: number;
    rir?: number;
  };
}
```

**עיצוב:**
```
┌─────────────────────────────────────────────────────┐
│  RIR _  │  חזרות __  │  85kg           (3)         │
└─────────────────────────────────────────────────────┘
```

- opacity: `opacity-50`
- Badge: `bg-gray-600` (אפור, לא פעיל)
- ערכים ריקים: קו תחתון `___`

---

### 3.5 טיימר מנוחה | Rest Timer

```typescript
interface RestTimer {
  // מצב
  isActive: boolean;
  
  // זמנים
  targetSeconds: number; // 120 (2:00)
  elapsedSeconds: number; // 112 (1:52)
  remainingSeconds: number; // 8
  
  // תצוגה
  display: {
    format: 'MM:SS'; // "01:52"
    position: 'center';
  };
  
  // עיגול התקדמות
  progressCircle: {
    size: 120; // px
    strokeWidth: 8;
    backgroundColor: 'gray-700';
    progressColor: 'coral'; // #FF6B6B או דומה
    direction: 'counterclockwise';
  };
  
  // כפתורים
  skipButton: {
    label: 'דלג';
    position: 'left';
  };
  
  targetTimeButton: {
    label: '02:00';
    icon: 'clock';
    position: 'right';
    onClick: () => void; // פותח בחירת זמן מנוחה
  };
}
```

**עיצוב טיימר:**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    ┌───────┐                        │
│      דלג          │ 01:52 │           ⏱ 02:00     │
│                    └───────┘                        │
│                                                     │
│              זמן מנוחה עד לסט                       │
└─────────────────────────────────────────────────────┘
```

**עיצוב מפורט:**
- עיגול חיצוני: `stroke-gray-700`
- עיגול התקדמות: `stroke-coral-500` (#FF6B6B)
- מספר במרכז: `text-3xl font-bold text-white`
- כפתור דלג: `text-white underline`
- יעד זמן: `text-gray-400` עם אייקון שעון
- כותרת: `text-gray-400 text-sm`

**התנהגות:**
1. טיימר מתחיל אוטומטית אחרי סיום סט
2. כשנגמר הזמן - רטט/צליל התראה
3. לחיצה על "דלג" - מדלג לסט הבא
4. לחיצה על יעד זמן - פותח modal לבחירת זמן מנוחה

---

## 4. States & Flows | מצבים וזרימות

### 4.1 מצבי המסך

```typescript
type WorkoutSessionState = 
  | 'performing_set'    // המשתמש מבצע סט
  | 'resting'           // מנוחה בין סטים
  | 'between_exercises' // מעבר בין תרגילים
  | 'completed';        // האימון הסתיים

interface WorkoutSessionScreen {
  state: WorkoutSessionState;
  
  // כשבמצב performing_set
  showActiveSetCard: true;
  showRestTimer: false;
  
  // כשבמצב resting
  showActiveSetCard: false; // או מוצג כ-completed
  showRestTimer: true;
}
```

### 4.2 זרימת סיום סט

```
1. משתמש לוחץ "סיים סט" (או swipe)
   ↓
2. הסט הפעיל נשמר ועובר לרשימת "הושלמו"
   ↓
3. טיימר מנוחה מתחיל
   ↓
4. כשטיימר נגמר (או "דלג"):
   - אם יש עוד סטים בתרגיל → סט הבא הופך לפעיל
   - אם זה היה הסט האחרון → מעבר לתרגיל הבא
   ↓
5. חזרה למצב performing_set
```

---

## 5. Data Structure | מבנה נתונים

```typescript
interface ActiveWorkoutSession {
  id: string;
  
  // מידע על האימון
  workoutTemplateId: string;
  workoutName: string;
  startedAt: Timestamp;
  
  // מיקום נוכחי
  currentExerciseIndex: number;
  currentSetIndex: number;
  
  // תרגילים
  exercises: WorkoutExercise[];
  
  // סטטיסטיקות
  stats: {
    totalTime: number; // seconds
    totalVolume: number; // kg
    completedSets: number;
    totalSets: number;
  };
}

interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  exerciseNameHe: string;
  imageUrl?: string;
  videoUrl?: string;
  instructions?: string;
  
  // סטים מתוכננים
  plannedSets: PlannedSet[];
  
  // סטים שבוצעו
  completedSets: CompletedSet[];
}

interface PlannedSet {
  setNumber: number;
  setType: 'warmup' | 'working' | 'dropset' | 'superset';
  targetReps: { min: number; max: number } | number;
  targetWeight?: number;
  targetRIR?: number;
  restSeconds?: number;
  notes?: string;
}

interface CompletedSet {
  setNumber: number;
  actualReps: number;
  actualWeight: number;
  actualRIR?: number;
  completedAt: Timestamp;
  notes?: string;
}
```

---

## 6. Styling Tokens | טוקנים לעיצוב

```typescript
const workoutSessionTokens = {
  colors: {
    // Primary accent
    teal: {
      400: '#2DD4BF',
      500: '#14B8A6',
    },
    
    // Rest timer
    coral: {
      500: '#FF6B6B',
      400: '#FF8585',
    },
    
    // Backgrounds
    background: {
      primary: '#0F172A',   // כהה מאוד
      card: '#1E293B',      // כרטיסים
      elevated: '#334155',  // אלמנטים מורמים
    },
    
    // Text
    text: {
      primary: '#FFFFFF',
      secondary: '#94A3B8',
      muted: '#64748B',
    },
    
    // Borders
    border: {
      default: '#334155',
      active: '#14B8A6',
    },
  },
  
  spacing: {
    screenPadding: '16px',
    cardPadding: '16px',
    sectionGap: '16px',
  },
  
  borderRadius: {
    card: '12px',
    button: '8px',
    badge: '50%',
  },
};
```

---

## 7. Component Hierarchy | היררכיית קומפוננטות

```
WorkoutSessionScreen/
├── ExerciseNavigationHeader
├── ExerciseDetails
│   ├── ExerciseName
│   └── ExerciseInstructions
├── ExerciseMedia
│   └── PlayButton
├── SetsList
│   ├── CompletedSetRow (multiple)
│   ├── ActiveSetCard
│   │   ├── SetTypeHeader
│   │   ├── SetInputFields
│   │   │   ├── RIRInput
│   │   │   ├── RepsInput
│   │   │   └── WeightInput
│   │   └── SetNote
│   └── UpcomingSetRow (multiple)
├── RestTimerSection
│   ├── CircularProgress
│   ├── TimerDisplay
│   ├── SkipButton
│   └── TargetTimeButton
└── FinishSetButton (when not resting)
```

---

## 8. אנימציות | Animations

```typescript
const animations = {
  // מעבר סט מפעיל לגמור
  setComplete: {
    type: 'slide-up-fade',
    duration: 300,
    easing: 'ease-out',
  },
  
  // טיימר מנוחה נכנס
  restTimerEnter: {
    type: 'scale-fade',
    from: { scale: 0.8, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    duration: 200,
  },
  
  // התקדמות טיימר
  timerProgress: {
    type: 'continuous',
    property: 'stroke-dashoffset',
  },
  
  // מעבר בין תרגילים
  exerciseTransition: {
    type: 'slide',
    direction: 'horizontal',
    duration: 300,
  },
};
```

---

## 9. Accessibility | נגישות

- כל האלמנטים האינטראקטיביים עם `aria-label` בעברית
- תמיכה ב-VoiceOver: הקראת מספר סט, משקל, חזרות
- גודל מינימלי לאזורי לחיצה: 44x44px
- ניגודיות צבעים: WCAG AA לפחות
- תמיכה בהגדלת טקסט

---

## 10. קבצים ליצירה | Files to Create

```
src/
├── components/
│   └── workout-session/
│       ├── WorkoutSessionScreen.tsx      // Main screen
│       ├── ExerciseNavigationHeader.tsx  // Header with arrows
│       ├── ExerciseDetails.tsx           // Name + instructions
│       ├── ExerciseMedia.tsx             // Video/Image
│       ├── SetsList.tsx                  // Container for all sets
│       ├── CompletedSetRow.tsx           // Single completed set
│       ├── ActiveSetCard.tsx             // Current set input
│       ├── UpcomingSetRow.tsx            // Future set preview
│       ├── RestTimer.tsx                 // Circular timer
│       └── SetInputField.tsx             // Reusable input
├── hooks/
│   └── useWorkoutSession.ts              // State management
├── types/
│   └── workout-session.types.ts          // TypeScript interfaces
└── utils/
    └── workout-timer.ts                  // Timer logic
```

---

## 11. הערות חשובות לסוכן | Important Notes for Agent

1. **RTL First**: כל העיצוב צריך להיות RTL מההתחלה. שימוש ב-`dir="rtl"` וב-Tailwind RTL utilities.

2. **Mobile First**: זה מסך שישמש בעיקר בנייד. הגודל והמרווחים צריכים להתאים למסך טלפון.

3. **Performance**: הטיימר צריך לרוץ חלק בלי לגרום ל-re-renders מיותרים. להשתמש ב-`useRef` לטיימר ו-`requestAnimationFrame` לאנימציית העיגול.

4. **State Persistence**: אם המשתמש יוצא מהאפליקציה באמצע אימון, המצב צריך להישמר ולהתאושש.

5. **Video/Image Fallback**: אם אין וידאו, להציג תמונת התרגיל. אם אין גם תמונה, להציג placeholder.

6. **Haptic Feedback**: בסיום סט ובסיום טיימר - להפעיל רטט (אם נתמך).

7. **Sound**: אפשרות להשמיע צליל בסיום מנוחה (ניתן לכיבוי בהגדרות).
