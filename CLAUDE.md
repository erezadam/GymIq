# CLAUDE.md – GymIQ

## פתיחת סשן (חובה)
```
✅ קראתי CLAUDE.md
מצב: [Builder/Reviewer]
משימה: [תיאור]
קבצים מותרים לשינוי: [רשימה]
```

---

## לפני כל שינוי - הרץ והדבק:
```bash
./scripts/verify.sh --before
```

---

## אחרי כל שינוי - הרץ והדבק:
```bash
./scripts/verify.sh --after
npm test
```

---

## 5 חוקי ברזל

| # | חוק | איך לוודא |
|---|-----|-----------|
| 1 | לא לשנות קבצים שלא ברשימה | `git diff --name-only` |
| 2 | לא למחוק פונקציות קיימות | verify.sh משווה before/after |
| 3 | classes רק מ-tokens | `grep -r "bg-\[" src/` צריך להיות ריק |
| 4 | אין שגיאות TypeScript | `npm run build` |
| 5 | בדיקות עוברות | `npm test` |

---

## פיצ'רים קריטיים (מוגנים ע"י בדיקות)

הבדיקות ב-`tests/critical.spec.ts` מוודאות שהפיצ'רים האלה קיימים:

- ✅ WorkoutSummaryModal
- ✅ handleDeleteClick  
- ✅ handleAddSet
- ✅ RestTimer
- ✅ calories בהיסטוריה

**אם הבדיקות נכשלות - לא לסיים את המשימה!**

---

## פורמט סיום משימה

```
## סיום משימה

### verify.sh --before:
[הדבק פלט]

### verify.sh --after:
[הדבק פלט]

### npm test:
[הדבק פלט]

### git diff --name-only:
[הדבק פלט]

### npm run build:
✅ הצליח / ❌ נכשל
```

---

## Auto-Commit (אוטומטי)

**Claude יבצע commit אוטומטית ויודיע למשתמש במקרים הבאים:**

1. **אחרי שינוי קבצים** - כשמשימת עריכה הושלמה בהצלחה
2. **אחרי deployment** - כשהפצה בוצעה בהצלחה
3. **אחרי תיקון באג** - כשבאג תוקן והבדיקות עברו

**פורמט הודעת commit:**
```
<type>: <תיאור קצר בעברית>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**סוגי commit:**
- `feat` - פיצ'ר חדש
- `fix` - תיקון באג
- `docs` - תיעוד
- `refactor` - שיפור קוד
- `chore` - תחזוקה

---

## קישורים
- [architecture.md](./docs/architecture.md) - מבנה טכני
- [style_and_ui.md](./docs/style_and_ui.md) - עיצוב
- [regressions.md](./docs/regressions.md) - באגים היסטוריים
