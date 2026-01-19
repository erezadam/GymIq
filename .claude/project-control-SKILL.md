---
name: gymiq-project-control
description: "Essential project control for GymIQ fitness app development. Enforces CLAUDE.md reading, prevents regressions, and ensures proper mobile-first development workflow. Use when starting any GymIQ development session or when you need to verify project compliance and prevent historical regressions."
---

# GymIQ Project Control

**מתי להפעיל:** תחילת כל סשן פיתוח, לפני כל שינוי קוד, או כשצריך לוודא עמידה בכללי הפרויקט

## Critical First Step
**ALWAYS start by reading CLAUDE.md** and declaring:

```
✅ קראתי את CLAUDE.md
---
מצב: [Builder/Reviewer/Documentation]  
משימה: [description]
קבצים שישתנו: [list]
קבצים תלויים: [list]
זרימת משתמש: דשבורד → [screen] → [target]
---
```

## Key Project Rules

### Mobile-First (90% mobile usage)
- Start with 375px width
- Touch targets minimum 44x44px
- No horizontal scroll
- RTL Hebrew support

### Regression Prevention
> **רשימת הרגרסיות המלאה נמצאת ב-`.claude/qa-testing-SKILL.md`**

לפני כל שינוי משמעותי, הרץ:
```bash
grep -r "WorkoutSummaryModal\|handleDeleteWorkout\|handleAddSet" src/ | wc -l
# אמור להיות > 0
```

### Before ANY UI changes:
1. Map dependencies: `grep -r "ComponentName" src/`
2. Create backup: `cp file.tsx file.tsx.backup`
3. Identify what MUST remain in the same area

### Testing Requirements
- Test with real Firebase data, not just UI
- Mobile 375px check
- Console errors check
- Full user flow from dashboard

## Available Commands
```bash
# Session initialization - check project status
git status && npm run build

# Post-change testing
npm run build && npm run lint

# Mobile verification - test in DevTools at 375px
# Open browser DevTools → Toggle Device Toolbar → iPhone SE

# Pre-change backup
cp file.tsx file.tsx.backup
```

## Architecture Notes
- Zustand stores for state management
- Firebase/Firestore backend
- Tailwind CSS with centralized tokens
- Domain-driven folder structure

This skill ensures adherence to CLAUDE.md guidelines and prevents the historical regressions that have plagued GymIQ development.
