#!/usr/bin/env bash
# Simulate the new 3-tier PR matching against real Firestore data.
# Usage: scripts/verifyPRFix.sh <email> <exerciseId>
set -e
EMAIL="${1:?email required}"
TARGET_ID="${2:?target exerciseId required}"
PROJECT="gymiq-e8b4e"
TOKEN=$(gcloud auth application-default print-access-token)
BASE="https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)"

echo "🔎 user lookup: $EMAIL"
USER_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST "${BASE}/documents:runQuery" \
  -d "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"users\"}],\"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"email\"},\"op\":\"EQUAL\",\"value\":{\"stringValue\":\"$EMAIL\"}}},\"limit\":1}}")
USERID=$(echo "$USER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['document']['name'].split('/')[-1]) if d and 'document' in d[0] else print('')")
echo "   uid=$USERID"

echo "📥 fetch target exercise definition: $TARGET_ID"
EX_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "${BASE}/documents/exercises/$TARGET_ID")

echo "📥 fetch all workouts for user..."
WO_FILE=$(mktemp)
EX_FILE=$(mktemp)
echo "$EX_RESP" > "$EX_FILE"
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST "${BASE}/documents:runQuery" \
  -d "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"workoutHistory\"}],\"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"userId\"},\"op\":\"EQUAL\",\"value\":{\"stringValue\":\"$USERID\"}}}}}" > "$WO_FILE"

python3 - "$TARGET_ID" "$EX_FILE" "$WO_FILE" <<'PY'
import json, re, sys
target_id, ex_file, wo_file = sys.argv[1], sys.argv[2], sys.argv[3]
ex_data = json.load(open(ex_file))
wo_data = json.load(open(wo_file))

def f(doc, k):
    v = doc.get('fields', {}).get(k)
    if not v: return None
    if 'stringValue' in v: return v['stringValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'doubleValue' in v: return float(v['doubleValue'])
    if 'booleanValue' in v: return v['booleanValue']
    return None

target_nameHe = f(ex_data, 'nameHe') or f(ex_data, 'exerciseNameHe')
target_cat = f(ex_data, 'category')
print(f"\n🎯 Target exercise:")
print(f"   id={target_id}")
print(f"   nameHe=\"{target_nameHe}\"")
print(f"   category={target_cat}")

HEB_PREFIXES = set('בלהומשכ')
def normalize(s):
    if not s: return ''
    return re.sub(r'\s+', ' ', s.strip()).lower()
def tokenize(s):
    n = normalize(s).replace('(',' ').replace(')',' ').replace(',',' ').replace('.',' ').replace('-',' ').replace('_',' ').replace('/',' ')
    out = set()
    for w in n.split(' '):
        if len(w) < 2: continue
        out.add(w)
        if len(w) >= 4 and w[0] in HEB_PREFIXES:
            out.add(w[1:])
    return out
def jaccard(a, b):
    if not a or not b: return 0
    inter = len(a & b)
    union = len(a | b)
    return 0 if union == 0 else inter/union

def first_token(s):
    n = normalize(s).replace('(',' ').replace(')',' ').replace(',',' ').replace('.',' ').replace('-',' ').replace('_',' ').replace('/',' ')
    for w in n.split(' '):
        if len(w) >= 3: return w
    return ''

target_norm = normalize(target_nameHe)
target_tokens = tokenize(target_nameHe)
target_first = first_token(target_nameHe)

# Tier results
result_by_id = None
result_by_name = None
result_by_fuzzy = None
fuzzy_matches = []

for x in wo_data:
    if 'document' not in x: continue
    d = x['document']
    if f(d, 'status') != 'completed': continue
    if d.get('fields', {}).get('deletedAt'): continue
    exs = d.get('fields', {}).get('exercises', {}).get('arrayValue', {}).get('values', [])
    workout_date = f(d, 'date')
    for e in exs:
        ef = e.get('mapValue', {}).get('fields', {})
        ex_id = ef.get('exerciseId', {}).get('stringValue')
        nameHe = ef.get('exerciseNameHe', {}).get('stringValue', '')
        cat = ef.get('category', {}).get('stringValue')
        sets = ef.get('sets', {}).get('arrayValue', {}).get('values', [])
        # filter valid sets
        valid = []
        for s in sets:
            sf = s.get('mapValue', {}).get('fields', {})
            stype = sf.get('type', {}).get('stringValue')
            if stype == 'warmup': continue
            ar_int = sf.get('actualReps', {}).get('integerValue')
            ar = int(ar_int) if ar_int else 0
            tm_int = sf.get('time', {}).get('integerValue')
            tm = int(tm_int) if tm_int else 0
            comp = sf.get('completed', {}).get('booleanValue')
            if ar > 0 or tm > 0 or comp:
                valid.append(sf)
        if not valid: continue
        # Best set
        weights = [int(s.get('actualWeight', {}).get('integerValue', 0)) or float(s.get('actualWeight', {}).get('doubleValue', 0)) for s in valid]
        reps = [int(s.get('actualReps', {}).get('integerValue', 0)) for s in valid]
        best_w = max(weights) if weights else 0
        best_r = max(reps) if reps else 0
        entry = (best_w, best_r, workout_date, nameHe, ex_id)
        # Tier 1: exact id
        if ex_id == target_id:
            if result_by_id is None or entry > result_by_id:
                result_by_id = entry
        # Tier 2: exact normalized name
        if normalize(nameHe) == target_norm and ex_id != target_id:
            if result_by_name is None or entry > result_by_name:
                result_by_name = entry
        # Tier 3: fuzzy (category + first-token + jaccard >= 0.5)
        if cat == target_cat and ex_id != target_id and normalize(nameHe) != target_norm:
            if first_token(nameHe) == target_first:
                jt = jaccard(target_tokens, tokenize(nameHe))
                if jt >= 0.5:
                    fuzzy_matches.append((jt, entry))
                    if result_by_fuzzy is None or entry > result_by_fuzzy:
                        result_by_fuzzy = entry

print()
print("═══ Three-tier match results ═══")
print(f" 1️⃣  exerciseId match:  {result_by_id if result_by_id else '— none'}")
print(f" 2️⃣  exact-name match:  {result_by_name if result_by_name else '— none'}")
print(f" 3️⃣  fuzzy match:       {result_by_fuzzy if result_by_fuzzy else '— none'}")
if fuzzy_matches:
    print(f"     Fuzzy candidates ({len(fuzzy_matches)}):")
    for jt, e in sorted(fuzzy_matches, key=lambda x: -x[0])[:5]:
        print(f"       jac={jt:.2f}  weight={e[0]}  reps={e[1]}  name=\"{e[3]}\"  id={e[4]}")

final = result_by_id or result_by_name or result_by_fuzzy
if final:
    via = "Tier 1 (id)" if result_by_id else ("Tier 2 (name)" if result_by_name else "Tier 3 (fuzzy)")
    print(f"\n✅ FINAL PR: weight={final[0]} reps={final[1]} via {via}  date={final[2]}")
else:
    print(f"\n❌ No PR found via any tier — red row will NOT show")
PY
rm -f "$WO_FILE" "$EX_FILE"
