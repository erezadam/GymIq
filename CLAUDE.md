# CLAUDE.md – GymIQ Control Center

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🚨 התחלה קבועה לכל משימה                                                    ║
║                                                                              ║
║   1. קרא CLAUDE.md הזה (נעשה אוטומטית)                                        ║
║   2. קרא project-control: `view /mnt/project/claude/project-control-SKILL.md`    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## חוקי ברזל קצרים

❌ **Firebase = single source of truth** - לא hardcoded arrays  
❌ **Mobile-first always** - כל UI נבדק ב-375px תחילה  
❌ **No manual testing claims** - רק בדיקות עם outputs אמיתיים  
❌ **No code deletion** שלא קשור ישירות למשימה  

---

## טבלת חוקים

| נושא | חוק | איך בודקים שבוצע | Skill לפתוח |
|------|-----|-------------------|-------------|
| **התחלה קבועה** | בתחילת כל משימה קוראים CLAUDE.md ואז קוראים project_control | בתחילת התשובה רשום "נקרא project_control" | `view /mnt/project/claude/project-control-SKILL.md` |
| **הגדרת משימה** | לפני שינוי קוד מנסחים במשפט אחד מה המטרה ומה ההגדרה של Done | יש סעיף Goal ו-Done | `view /mnt/project/claude/project-control-SKILL.md` |
| **היקף שינוי** | לא משנים קבצים שלא קשורים ישירות למשימה | ברשימת הקבצים מופיעים רק קשורים | `view /mnt/project/claude/project-control-SKILL.md` |
| **מניעת רגרסיה** | כל שינוי כולל בדיקת השפעה על יכולות קיימות | יש סעיף Regression checks | `view /mnt/project/claude/qa-testing-SKILL.md` |
| **תיקון באגים** | בבאגים מתחילים בשחזור הבעיה לפני תיקון | יש Steps to reproduce | `view /mnt/project/claude/qa-testing-SKILL.md` |
| **בדיקות** | אחרי תיקון מריצים בדיקות רלוונטיות ומדווחים תוצאה | יש Tests run ו-Results | `view /mnt/project/claude/qa-testing-SKILL.md` |
| **תיעוד שינוי** | כל שינוי משמעותי כולל עדכון תיעוד רלוונטי | יש Docs updated | `view /mnt/project/claude/documentation-SKILL.md` |
| **UI RTL עברית** | בכל מסך בעברית בודקים כיווניות טקסט קלטים אייקונים וניווט | יש RTL checklist summary | `view /mnt/project/claude/mobile-rtl-SKILL.md` |
| **iOS מובייל** | בודקים גדלי מסך מקלדת safe area גלילה ופוקוס | יש Mobile checks | `view /mnt/project/claude/mobile-rtl-SKILL.md` |
| **ביצועים** | לא מוסיפים טעינות כבדות בלי הצדקה | יש Performance notes | `view /mnt/project/claude/project-control-SKILL.md` |
| **אבטחה סודות** | לא מכניסים מפתחות לקוד ולא מדפיסים סודות ללוג | יש Security check | `view /mnt/project/claude/project-control-SKILL.md` |
| **Firebase** | כל שינוי נתונים כולל בדיקת rules ו-migrations במידת הצורך | יש Data change notes | `view /mnt/project/claude/firebase-data-SKILL.md` |
| **פריסה** | לפני פריסה מוודאים env נכון build נקי ו-rollback plan | יש Deploy checklist | `view /mnt/project/claude/deployment-SKILL.md` |
| **סיום** | מסיימים בסיכום מה שונה איך נבדק ומה נשאר פתוח | יש Summary + Next | `view /mnt/project/claude/project-control-SKILL.md` |

---

## טבלת טריגרים - איזה Skills לפתוח

| קטגוריית משימה | מילות מפתח | Skills לפתוח |
|----------------|-------------|-------------|
| **באגים ובדיקות** | bug, fix, regression, test, failing, error, crash, broken, debug | `view /mnt/project/claude/qa-testing-SKILL.md` |
| **עברית ומובייל** | hebrew, rtl, ios, mobile, layout, responsive, iphone, android, touch | `view /mnt/project/claude/mobile-rtl-SKILL.md` |
| **פריסה ותשתיות** | deploy, release, ci, env, firebase, hosting, production, build | `view /mnt/project/claude/deployment-SKILL.md` |
| **רפקטור וארכיטקטורה** | refactor, architecture, structure, cleanup, organize, rename, move | `view /mnt/project/claude/project-control-SKILL.md` |
| **UI ועיצוב** | design, style, color, theme, css, tailwind, component, visual | `view /mnt/project/claude/mobile-rtl-SKILL.md` |
| **נתונים ו-Firebase** | data, database, firestore, collection, document, query, auth | `view /mnt/project/claude/firebase-data-SKILL.md` |
| **ביצועים ואופטימיזציה** | performance, optimize, slow, fast, cache, memory, bundle | `view /mnt/project/claude/project-control-SKILL.md` |
| **תכנון ותיעוד** | plan, design, document, spec, requirements, architecture | `view /mnt/project/claude/documentation-SKILL.md` |

---

## כלל ביצוע

1. **קרא project_control** תמיד ראשון
2. **זהה טריגרים** במשימה ופתח Skills רלוונטיים
3. **בצע לפי הצ'קליסט** שבתוך ה-Skills
4. **סיים עם סיכום** קצר + מה נבדק

---

## פורמט דיווח נדרש

```
✅ נקרא project_control
✅ נקרא [שם_skill]

🎯 Goal: [משפט אחד - מה המטרה]
🏁 Done: [משפט אחד - איך יודעים שסיימנו]

📁 Files: [רשימת קבצים שישתנו]

[ביצוע המשימה לפי הצ'קליסט]

📋 Summary:
- Changed: [מה שונה]
- Tested: [איך נבדק]
- Next: [מה נשאר לעשות]
```

---

```
══════════════════════════════════════════════════════════════════════════════
עדכון אחרון: ינואר 2026 | נתב חכם + Skills מפורטים
══════════════════════════════════════════════════════════════════════════════
```