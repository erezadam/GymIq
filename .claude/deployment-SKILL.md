---
name: gymiq-deployment
description: "Pre-deployment validation and version management for GymIQ. Ensures all quality gates pass, documentation is updated, and deployment follows proper procedures. Use before any production deployment or version release."
---

# GymIQ Deployment & Version Management

**מתי להפעיל:** לפני כל deployment לפרודקשן, לפני tag גרסה חדשה, או כשמכינים release

## Pre-Deployment Checklist

### 1. Code Quality Gates
```
□ npm run build - successful
□ npm run lint - no errors  
□ npm run test - all tests pass
□ TypeScript compilation - no errors
□ No console.error in production code
```

### 2. Functional Verification  
```
□ Critical user flows tested (from qa_scenarios.md):
  - דשבורד → התחל אימון → אימון פעיל → סיום
  - אימון פעיל → Auto-save functioning
  - היסטוריה → displays workout.calories correctly
  - WorkoutSummaryModal appears after workout completion
```

### 3. Mobile & RTL Verification
```
□ 375px mobile layout - no horizontal scroll
□ Hebrew text flows RTL correctly
□ Touch targets minimum 44x44px
□ PWA installation works
□ All critical buttons accessible on mobile
```

### 4. Historical Regression Check
```
□ No regression of documented issues:
  ✅ קלוריות shown in history (not estimated)
  ✅ WorkoutSummaryModal functional
  ✅ Delete workout button present
  ✅ Navigation header stable
  ✅ Volume field exists
```

## Version Management

### Semantic Versioning Rules
```
MAJOR.MINOR.PATCH (e.g., 1.9.3)

PATCH (1.9.X): Bug fixes, small tweaks
- Fixed calories display bug
- Corrected RTL alignment issue

MINOR (1.X.0): New features, non-breaking changes  
- Added rest timer feature
- New exercise filtering options

MAJOR (X.0.0): Breaking changes, major rewrites
- Complete UI redesign
- Database schema changes
```

### Version Bump Process

> **הערה:** הפרויקט משתמש בסקריפט אוטומטי `scripts/update-version.cjs` שרץ ב-prebuild!

```bash
# הגרסה מתעדכנת אוטומטית בכל build:
npm run build
# → מעדכן public/version.json
# → מעדכן public/sw.js CACHE_VERSION

# לבדיקת הגרסה הנוכחית:
cat public/version.json

# לאחר deploy - עדכון CHANGELOG ו-git:
git add -A
git commit -m "v$(cat public/version.json | grep version | cut -d'"' -f4) - תיאור השינויים"
git push origin main
```

### Version Format
```
1.10.XX - הגרסה מתעדכנת אוטומטית
- כל build מעלה את ה-PATCH ב-1
- שינויים גדולים יותר - לעדכן ידנית ב-version.json
```

## Deployment Procedures

### Firebase Deployment
```bash
# 1. Build for production
npm run build

# 2. Test build locally
npm run preview

# 3. Deploy to Firebase
firebase deploy --only hosting

# 4. Verify production site
curl -s https://your-gymiq-app.web.app | grep -q "GymIQ" && echo "✅ Site accessible"
```

### Post-Deployment Verification
```
□ Production site loads without errors
□ Login flow works
□ Critical features functional:
  - Create new workout
  - Add sets to active workout  
  - Complete workout and see summary
  - View workout history
```

## Rollback Procedures

### If Deployment Fails:
```bash
# 1. Rollback Firebase hosting
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID TARGET_SITE_ID

# 2. Notify users (if needed)
# Add maintenance notice to Firebase

# 3. Investigate and fix
# Review logs, identify issue, create hotfix branch
```

### Emergency Hotfix Process:
```
1. Create hotfix branch from main
2. Apply minimal fix
3. Test only the specific fix
4. Skip extensive QA (emergency only)
5. Deploy immediately
6. Update documentation after fix
```

## Documentation Requirements

### Before Deployment:
```
□ CHANGELOG.md reflects all changes
□ Version number updated in package.json
□ Architecture docs updated if system changed
□ QA scenarios updated if new flows added
```

### After Deployment:
```
□ Git tag created with version number
□ Production deployment logged
□ Any production issues documented
□ Success metrics recorded
```

## Integration with Firebase

### Firestore Rules Verification
```bash
# Test security rules
firebase firestore:rules:test --rules=firestore.rules --test=firestore.test.js

# Deploy rules if changed
firebase deploy --only firestore:rules
```

### Performance Monitoring
```javascript
// Verify these are set up in production:
- Firebase Performance Monitoring
- Firebase Analytics
- Error reporting (console.error tracking)
```

This skill ensures GymIQ deployments are reliable, documented, and can be rolled back safely if issues occur.
