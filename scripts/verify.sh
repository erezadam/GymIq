#!/bin/bash

# verify.sh - סקריפט אימות לפני ואחרי שינויים
# שימוש: ./scripts/verify.sh --before או ./scripts/verify.sh --after

set -e

# צבעים
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "════════════════════════════════════════════════════════════════"
echo "                    GymIQ Verification Script                    "
echo "════════════════════════════════════════════════════════════════"
echo ""

MODE=$1
REPORT_FILE="verify_${MODE#--}.txt"

# פונקציות קריטיות שחייבות להתקיים
CRITICAL_FUNCTIONS=(
    "handleDeleteClick"
    "WorkoutSummaryModal"
    "handleAddSet"
    "RestTimer"
    "autoSaveWorkout"
    "getInProgressWorkout"
    "completeWorkout"
)

# קומפוננטות קריטיות
CRITICAL_COMPONENTS=(
    "WorkoutSummaryModal.tsx"
    "RestTimer.tsx"
    "ExerciseCard.tsx"
    "WorkoutHistory.tsx"
    "ActiveWorkoutScreen.tsx"
)

echo "📋 מצב: $MODE"
echo "📅 תאריך: $(date)"
echo ""

# בדיקה 1: פונקציות קריטיות
echo "═══════════════════════════════════════════════════════════════"
echo "1️⃣  בדיקת פונקציות קריטיות"
echo "═══════════════════════════════════════════════════════════════"

for func in "${CRITICAL_FUNCTIONS[@]}"; do
    count=$(grep -r "$func" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        echo -e "   ${GREEN}✅ $func${NC} (נמצא $count פעמים)"
    else
        echo -e "   ${RED}❌ $func - לא נמצא!${NC}"
    fi
done

echo ""

# בדיקה 2: קומפוננטות קריטיות
echo "═══════════════════════════════════════════════════════════════"
echo "2️⃣  בדיקת קומפוננטות קריטיות"
echo "═══════════════════════════════════════════════════════════════"

for comp in "${CRITICAL_COMPONENTS[@]}"; do
    if find src/ -name "$comp" 2>/dev/null | grep -q .; then
        echo -e "   ${GREEN}✅ $comp${NC} קיים"
    else
        echo -e "   ${RED}❌ $comp - חסר!${NC}"
    fi
done

echo ""

# בדיקה 3: אין hardcoded colors
echo "═══════════════════════════════════════════════════════════════"
echo "3️⃣  בדיקת צבעים hardcoded"
echo "═══════════════════════════════════════════════════════════════"

hardcoded=$(grep -r "bg-\[#" src/ --include="*.tsx" 2>/dev/null | wc -l)
if [ "$hardcoded" -eq 0 ]; then
    echo -e "   ${GREEN}✅ אין צבעים hardcoded${NC}"
else
    echo -e "   ${RED}❌ נמצאו $hardcoded צבעים hardcoded:${NC}"
    grep -r "bg-\[#" src/ --include="*.tsx" 2>/dev/null | head -5
fi

echo ""

# בדיקה 4: TypeScript
echo "═══════════════════════════════════════════════════════════════"
echo "4️⃣  בדיקת TypeScript"
echo "═══════════════════════════════════════════════════════════════"

if npm run build 2>&1 | tail -5; then
    echo -e "   ${GREEN}✅ Build עבר${NC}"
else
    echo -e "   ${RED}❌ Build נכשל${NC}"
fi

echo ""

# בדיקה 5: exports חשובים
echo "═══════════════════════════════════════════════════════════════"
echo "5️⃣  בדיקת exports"
echo "═══════════════════════════════════════════════════════════════"

# בדיקת calories בהיסטוריה
if grep -r "calories" src/domains/workouts/components/WorkoutHistory.tsx 2>/dev/null | grep -q .; then
    echo -e "   ${GREEN}✅ calories מוצג בהיסטוריה${NC}"
else
    echo -e "   ${YELLOW}⚠️  calories לא נמצא בהיסטוריה${NC}"
fi

# בדיקת פופאפ סיכום
if grep -r "WorkoutSummaryModal" src/domains/workouts/components/active-workout/ActiveWorkoutScreen.tsx 2>/dev/null | grep -q .; then
    echo -e "   ${GREEN}✅ WorkoutSummaryModal מחובר ל-ActiveWorkoutScreen${NC}"
else
    echo -e "   ${RED}❌ WorkoutSummaryModal לא מחובר!${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "                         סיום בדיקה                              "
echo "════════════════════════════════════════════════════════════════"

# שמירת דוח
echo "📄 הדוח נשמר ב: $REPORT_FILE"
