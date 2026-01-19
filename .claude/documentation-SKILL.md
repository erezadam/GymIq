---
name: gymiq-documentation
description: "Documentation and change tracking for GymIQ project. Ensures proper documentation updates, CHANGELOG maintenance, and architectural decision recording. Use after implementing features, before deployments, or when making architectural changes."
---

# GymIQ Documentation & Change Tracking

**מתי להפעיל:** אחרי כל פיצ'ר, לפני deployment, או כששינוי מבנה מערכת

## Critical Documentation Flow

### 1. After Every Feature Implementation
```
□ Update CHANGELOG.md with semantic version
□ Add entry to qa_scenarios.md if new testing needed
□ Update architecture.md if system structure changed
□ Update style_and_ui.md if design tokens/patterns added
```

### 2. Before Every Deployment
```
□ Version bump in package.json
□ CHANGELOG.md has all changes since last version
□ All docs reflect current system state
□ Regression checklist verified against historical issues
```

## Documentation Standards

### CHANGELOG.md Format
```markdown
## [1.X.X] - YYYY-MM-DD

### Added
- [פיצ'ר חדש] - תיאור קצר

### Fixed  
- [באג] - מה תוקן ואיך

### Changed
- [שינוי] - מה השתנה ולמה

### Regression Prevention
- ✅ Verified [specific historical bug] still fixed
```

### architecture.md Updates
```markdown
## When to Update:
- New Firebase collection added
- New store created (Zustand)
- New service file added
- Route structure changed
- Major component refactoring
```

### qa_scenarios.md Updates
```markdown
## When to Add:
- New user flow created
- New feature with edge cases
- Historical regression occurred (add prevention test)
- Mobile/RTL issue found and fixed
```

## Historical Regression Tracking

> **רשימת הרגרסיות המלאה נמצאת ב-`.claude/qa-testing-SKILL.md`**

### הוספת רגרסיה חדשה:
כשמתגלה באג שחוזר, הוסף אותו ל-`qa-testing-SKILL.md` בטבלת הרגרסיות:

```markdown
| DD/MM | תיאור הבעיה | פקודת בדיקה |
```

## Documentation Commands

### Pre-Deployment Checklist:
```bash
# 1. Version check
grep "version" package.json
grep "## \[" CHANGELOG.md | head -1

# 2. Docs sync check  
git status docs/
git diff docs/

# 3. Regression verification
grep -r "WorkoutSummaryModal" src/
grep -r "workout.calories" src/
```

### Post-Feature Documentation:
```bash
# 1. Update CHANGELOG
echo "## [$(date +%Y-%m-%d)] - New Feature" >> CHANGELOG.md

# 2. Check what docs need updates
find docs/ -name "*.md" -exec echo "Review: {}" \;
```

## Integration with Other Skills

### Works With:
- **project-control**: Ensures docs compliance before coding
- **qa-testing**: Documents test scenarios and results  
- **firebase-data**: Documents schema changes
- **mobile-rtl**: Documents UI/UX decisions

### Documentation Workflow:
1. **Start**: project-control reads current state
2. **Develop**: Feature implementation  
3. **Test**: qa-testing validates
4. **Document**: THIS SKILL updates all docs
5. **Deploy**: With complete documentation

## Success Metrics

### Documentation Health Check:
```
□ CHANGELOG.md updated within 1 day of feature completion
□ No architectural changes without architecture.md update
□ All historical regressions have documented prevention tests
□ Documentation dates match code commit dates
```

This skill ensures GymIQ maintains institutional knowledge and prevents the historical "forgotten wisdom" problem that leads to repeated regressions.
