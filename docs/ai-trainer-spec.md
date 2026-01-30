# מאמן AI - איפיון טכני

## סקירה כללית
מאמן AI שיוצר תוכניות אימון מותאמות אישית עם המלצות משקל חכמות.
המערכת משתמשת ב-GPT-4o-mini דרך OpenAI API עם שתי קריאות מותאמות:
קריאה 1 לבחירת שרירים, קריאה 2 ליצירת אימון עם המלצות משקל מבוססות היסטוריה.

## ארכיטקטורה

### Backend (Firebase Functions)
- **מיקום:** `functions/src/ai-trainer/`
- **מודל:** GPT-4o-mini (OpenAI)
- **Secret:** OPENAI_API_KEY (מוגדר ב-Firebase Secrets)
- **Runtime:** Node.js 20, 2nd Gen Cloud Functions

### קבצים עיקריים:
| קובץ | תפקיד |
|------|--------|
| `openaiClient.ts` | קריאות ל-OpenAI API (Call 1 + Call 2) |
| `generateWorkout.ts` | Cloud Function ראשי (`generateAIWorkout`) |
| `types.ts` | טיפוסי TypeScript (backend) |
| `rateLimiter.ts` | הגבלת יצירות ליום |

### Frontend
| קובץ | תפקיד |
|------|--------|
| `src/domains/workouts/services/aiTrainerService.ts` | שירות ראשי - בניית context + קריאה ל-Cloud Function |
| `src/domains/workouts/services/aiTrainer.types.ts` | טיפוסי TypeScript (frontend) |
| `src/domains/workouts/components/ai-trainer/AIBundleCard.tsx` | תצוגת תוכנית AI |
| `src/domains/workouts/components/active-workout/ExerciseCard.tsx` | תצוגת המלצה סגולה באימון פעיל |
| `src/shared/components/WorkoutCard/WorkoutCard.tsx` | תצוגת המלצה בכרטיס אימון |

## זרימת יצירת אימון

```
1. משתמש לוחץ "צור אימון AI"
2. Frontend: buildContext()
   - טוען תרגילים, שרירים, היסטוריה
   - extractExerciseHistory() - שולף ביצוע אחרון לכל תרגיל
3. Frontend: callCloudFunction(context)
   - שולח payload עם exerciseHistory
4. Backend: Call 1 (אם צריך) - GPT בוחר שרירים
5. Backend: filterExercisesByMuscles()
6. Backend: Call 2 - GPT בוחר תרגילים + המלצות משקל
   - מקבל exerciseHistory עם lastWeight/lastReps לכל תרגיל
   - ההנחיה: לא לחרוג מ-±10% מהמשקל האחרון
7. Backend: convertClaudeResponse() - ממיר לפורמט GeneratedWorkout
8. Frontend: saveWorkoutHistory() - שומר ב-Firestore עם aiRecommendations
```

## מבנה נתונים

### אימון ב-Firestore:
```json
{
  "userId": "abc123",
  "name": "אימון AI #5",
  "status": "planned",
  "source": "ai_trainer",
  "aiWorkoutNumber": 5,
  "bundleId": "bundle_1706...",
  "aiRecommendations": {
    "exerciseId1": {
      "weight": 64,
      "repRange": "8-10",
      "sets": 3,
      "reasoning": "עשה 64kg×8, ממליץ להישאר באותו משקל"
    },
    "exerciseId2": {
      "weight": 22.5,
      "repRange": "10-12",
      "sets": 4,
      "reasoning": "עשה 22.5kg×10, ממליץ להישאר עד שיגיע ל-12"
    }
  },
  "exercises": [
    {
      "exerciseId": "exerciseId1",
      "exerciseName": "Bench Press",
      "exerciseNameHe": "לחיצת חזה",
      "category": "chest",
      "isCompleted": false,
      "sets": []
    }
  ]
}
```

### ExercisePerformanceData (נשלח ל-GPT):
```typescript
interface ExercisePerformanceData {
  exerciseId: string
  lastWeight: number       // משקל אחרון (kg)
  lastReps: number         // חזרות אחרונות
  lastDate: string         // תאריך ISO
  recentSessions?: {       // 3-5 אימונים אחרונים
    weight: number
    reps: number
    date: string
  }[]
}
```

### AIRecommendation:
```typescript
interface AIRecommendation {
  weight: number      // המלצת משקל (kg)
  repRange: string    // "8-10"
  sets: number        // מספר סטים
  reasoning?: string  // הסבר (לדיבוג)
}
```

## זרימת נתוני המלצות (Data Flow)

```
1. extractExerciseHistory()
   - קורא 10 אימונים אחרונים מלאים (getUserWorkoutHistoryFull)
   - לכל תרגיל: מוצא את הסט הכי כבד שהושלם
   - מחזיר: ExercisePerformanceData[]

2. Cloud Function payload
   - exerciseHistory: [{id, lastWeight, lastReps, date}, ...]

3. GPT Prompt (Call 2)
   - System: כללי המלצות משקל (±5%, מקסימום ±10%)
   - User: רשימת תרגילים + exerciseHistory + הוראות

4. GPT Response
   - recommendation: { weight, repRange, sets, reasoning }

5. convertClaudeResponse()
   - aiRecommendations[exerciseId] = { weight, repRange, sets, reasoning }

6. saveWorkoutHistory()
   - שומר aiRecommendations ל-Firestore

7. toWorkoutHistory()
   - קורא aiRecommendations מ-Firestore

8. WorkoutHistory.tsx → handleConfirmContinue()
   - שומר aiRecommendations ב-localStorage

9. useActiveWorkout.ts → initWorkout()
   - קורא מ-localStorage ומצמיד לכל תרגיל

10. ExerciseCard.tsx
    - מציג שורה סגולה: "המלצה: 64kg × 8-10 (3 סטים)"
```

## כללי GPT Prompt

### System Prompt - כללי המלצות משקל:
- בסס על ביצוע אחרון של המשתמש
- אם עשה 64kg × 8 → המלץ 64-67kg
- לא ירידה של יותר מ-10% ממה שעשה
- לא עלייה של יותר מ-5% ממה שעשה
- אם אין היסטוריה → משקל שמרני
- weight = 0 לתרגילי משקל גוף/חימום
- הוסף reasoning בעברית

### User Prompt כולל:
- בקשת המשתמש (משך, שרירים, חימום)
- רשימת תרגילים זמינים (id, nameHe, muscle)
- שרירים זמינים
- תרגילים לא לכלול (אתמול)
- היסטוריית אימונים (5 אחרונים)
- **היסטוריית ביצוע לתרגילים** (exerciseHistory) - קריטי!

## תצוגת המלצות

### מסך אימון פעיל (ExerciseCard.tsx):
- **שורה אדומה:** ביצוע אחרון (lastWorkoutData)
- **שורה סגולה:** המלצת AI (aiRecommendation)
- צבע: `#A855F7` (purple)
- רקע: `rgba(168, 85, 247, 0.1)`
- גבול: `rgba(168, 85, 247, 0.3)`

### כרטיס אימון (WorkoutCard.tsx):
- תרגילי AI עם המלצה → שורה סגולה
- תרגילי AI ללא המלצה → ללא תצוגת סטים
- אימון רגיל → טבלת סטים רגילה

## הגבלת שימוש (Rate Limiting)
- **`rateLimiter.ts`** - מנהל הגבלה יומית
- Document path: `aiTrainerUsage/{userId}_{date}`
- בדיקה לפני כל יצירה

## Fallback
- אם GPT נכשל → `generateFallbackWorkout()` (בחירה רנדומלית)
- Fallback לא כולל aiRecommendations
- Fallback לא כולל reasoning

## שדות חשובים באימון:
| שדה | תפקיד | מיקום |
|-----|--------|-------|
| `source` | `'ai_trainer'` / `'manual'` | WorkoutHistoryEntry |
| `aiWorkoutNumber` | מספר סידורי | WorkoutHistoryEntry |
| `bundleId` | מזהה מקבץ | WorkoutHistoryEntry |
| `aiRecommendations` | המלצות לכל תרגיל | WorkoutHistoryEntry |
| `aiRecommendation` | המלצה בודדת | ActiveWorkoutExercise (runtime) |
| `lastWorkoutData` | ביצוע אחרון | ActiveWorkoutExercise (runtime) |

## עדכון אחרון
- **תאריך:** 29/01/2026
- **שינוי:** מעבר מ-Claude ל-GPT-4o-mini + המלצות מבוססות היסטוריה
