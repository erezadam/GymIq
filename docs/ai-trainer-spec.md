# מאמן AI - איפיון טכני

## סקירה כללית
מאמן AI שיוצר תוכניות אימון מותאמות אישית עם המלצות משקל.

## ארכיטקטורה

### Backend (Firebase Functions)
- מיקום: functions/src/ai-trainer/
- מודל: GPT-4o-mini (OpenAI)
- Secret: OPENAI_API_KEY

### קבצים עיקריים - Backend:
| קובץ | תפקיד |
|------|--------|
| openaiClient.ts | קריאות ל-OpenAI API |
| generateWorkout.ts | Cloud Function ראשי |
| types.ts | טיפוסי TypeScript |
| rateLimiter.ts | הגבלת 5 יצירות ליום |

### קבצים עיקריים - Frontend:
| קובץ | תפקיד |
|------|--------|
| ExerciseCard.tsx | תצוגת המלצה באימון פעיל |
| AIBundleCard.tsx | תצוגת המלצה בכרטיס Bundle |
| WorkoutCard.tsx | תצוגת המלצה בהיסטוריה |

## זרימת יצירת אימון

1. משתמש לוחץ "צור אימון AI"
2. קריאה 1 (אם צריך): GPT בוחר שרירים לאימון
3. סינון תרגילים לפי שרירים שנבחרו
4. קריאה 2: GPT בוחר תרגילים + המלצות משקל
5. שמירה ב-Firestore עם aiRecommendations

## מבנה נתונים ב-Firestore
```json
{
  "exercises": [],
  "aiRecommendations": {
    "[exerciseId]": {
      "weight": "number",
      "repRange": "8-12",
      "sets": "number",
      "reasoning": "הסבר קצר (אופציונלי)"
    }
  },
  "source": "ai_trainer"
}
```

## תצוגה ב-Frontend

### מסך אימון פעיל:
- שורה אדומה: "אימון אחרון: X חזרות @ Ykg"
- שורה סגולה: "💡 המלצה: Zkg × 8-10 (3 סטים)"

### פורמט המלצה:
💡 המלצה: [weight]kg × [repRange] ([sets] סטים)

## הגבלות
- 5 יצירות אימון ליום למשתמש
- Timeout: 60 שניות
- Memory: 256MiB

## בעיות ידועות / TODO
- [ ] שיפור דיוק המלצות משקל (שליחת היסטוריה מלאה ל-GPT)
- [ ] שדה reasoning לא מוצג ב-UI (נשמר ב-Firebase בלבד)
- [ ] inline styles במקום design tokens (ExerciseCard, AIBundleCard, WorkoutCard)
- [ ] reasoning אופציונלי - לפעמים GPT לא מחזיר
