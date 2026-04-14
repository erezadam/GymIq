#!/usr/bin/env bash
# Usage: scripts/diagnosePR.sh <email> <exerciseNameSubstring>
set -e
EMAIL="${1:?email required}"
QNAME="${2:?exercise name substring required}"
PROJECT="gymiq-e8b4e"
TOKEN=$(gcloud auth application-default print-access-token)
BASE="https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)"

echo "🔎 Looking up user by email: $EMAIL"
USER_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST "${BASE}/documents:runQuery" \
  -d "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"users\"}],\"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"email\"},\"op\":\"EQUAL\",\"value\":{\"stringValue\":\"$EMAIL\"}}},\"limit\":1}}")
USERID=$(echo "$USER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['document']['name'].split('/')[-1]) if d and 'document' in d[0] else print('')")
if [ -z "$USERID" ]; then
  echo "❌ no user found"; echo "$USER_RESP" | head -10; exit 1
fi
echo "✅ uid=$USERID"

echo "📥 Fetching workoutHistory for user (paginated)..."
ALL_FILE=$(mktemp)
NEXT=""
PAGE=0
> "$ALL_FILE"
while :; do
  PAGE=$((PAGE+1))
  PAYLOAD=$(cat <<EOF
{"structuredQuery":{"from":[{"collectionId":"workoutHistory"}],"where":{"fieldFilter":{"field":{"fieldPath":"userId"},"op":"EQUAL","value":{"stringValue":"$USERID"}}}, "limit": 300}}
EOF
)
  RESP=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -X POST "${BASE}/documents:runQuery" -d "$PAYLOAD")
  COUNT=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for x in d if 'document' in x))")
  echo "  page $PAGE → $COUNT docs"
  echo "$RESP" >> "$ALL_FILE"
  break  # runQuery returns all matching docs in one call; no pagination cursor for runQuery
done

echo ""
echo "🧪 Analyzing..."
python3 - "$ALL_FILE" "$QNAME" <<'PY'
import sys, json
path, qname = sys.argv[1], sys.argv[2]
data = json.load(open(path))
docs = [x['document'] for x in data if 'document' in x]
print(f"📚 Total workoutHistory docs: {len(docs)}\n")

def field(d, k):
    f = d.get('fields', {}).get(k)
    if not f: return None
    if 'stringValue' in f: return f['stringValue']
    if 'timestampValue' in f: return f['timestampValue']
    if 'integerValue' in f: return int(f['integerValue'])
    if 'doubleValue' in f: return float(f['doubleValue'])
    if 'booleanValue' in f: return f['booleanValue']
    if 'arrayValue' in f: return [v for v in f['arrayValue'].get('values', [])]
    if 'mapValue' in f: return f['mapValue'].get('fields', {})
    return f

status_count = {}
matches = []
for d in docs:
    fields = d.get('fields', {})
    status = fields.get('status', {}).get('stringValue') or '<missing>'
    status_count[status] = status_count.get(status, 0) + 1
    deleted_at = fields.get('deletedAt', {}).get('timestampValue')
    date = fields.get('date', {}).get('timestampValue')
    exercises_arr = fields.get('exercises', {}).get('arrayValue', {}).get('values', [])
    for ex in exercises_arr:
        exf = ex.get('mapValue', {}).get('fields', {})
        name = exf.get('exerciseNameHe', {}).get('stringValue') or exf.get('exerciseName', {}).get('stringValue') or ''
        if qname in name:
            sets_arr = exf.get('sets', {}).get('arrayValue', {}).get('values', [])
            sets = []
            for s in sets_arr:
                sf = s.get('mapValue', {}).get('fields', {})
                sets.append({
                    'type': sf.get('type', {}).get('stringValue'),
                    'actualReps': int(sf.get('actualReps', {}).get('integerValue', 0)) if 'integerValue' in sf.get('actualReps', {}) else (sf.get('actualReps', {}).get('doubleValue') or 0),
                    'actualWeight': sf.get('actualWeight', {}).get('doubleValue') or (int(sf.get('actualWeight', {}).get('integerValue', 0)) if 'integerValue' in sf.get('actualWeight', {}) else 0),
                    'time': sf.get('time', {}).get('integerValue') or sf.get('time', {}).get('doubleValue') or 0,
                    'completed': sf.get('completed', {}).get('booleanValue'),
                })
            matches.append({
                'docId': d['name'].split('/')[-1],
                'status': status,
                'deletedAt': deleted_at,
                'date': date,
                'exerciseId': exf.get('exerciseId', {}).get('stringValue'),
                'name': name,
                'sets': sets,
            })

print('📊 Status distribution:')
for s,n in sorted(status_count.items(), key=lambda x:-x[1]): print(f'   {s}: {n}')
print()
print(f'🔎 Matching workouts containing "{qname}": {len(matches)}\n')

would_count = 0
exercise_ids = set()
for m in matches:
    exercise_ids.add(m['exerciseId'])
    valid = [s for s in m['sets'] if s['type'] != 'warmup' and (
        (s['actualReps'] and float(s['actualReps']) > 0) or
        (s['time'] and float(s['time']) > 0) or
        s['completed']
    )]
    passes = m['status'] == 'completed' and not m['deletedAt'] and len(valid) > 0
    if passes: would_count += 1
    print(f"📋 doc={m['docId']}  date={m['date']}  status={m['status']}  deletedAt={'YES' if m['deletedAt'] else 'no'}")
    print(f"   exerciseId={m['exerciseId']}  name=\"{m['name']}\"")
    print(f"   sets={len(m['sets'])}  validSets={len(valid)}")
    for i,s in enumerate(m['sets']):
        print(f"      set#{i+1} type={s['type'] or 'normal'} actualReps={s['actualReps']} actualWeight={s['actualWeight']} time={s['time']} completed={s['completed']}")
    print(f"   → passes PR filter? {'✅ YES' if passes else '❌ NO'}\n")

print('═════════════════════════════════════════')
print(f'📈 Summary:')
print(f"   Distinct exerciseIds: {len(exercise_ids)} → {list(exercise_ids)}")
print(f"   Workouts that WOULD count toward PR: {would_count} / {len(matches)}")
if len(exercise_ids) > 1:
    print('   ⚠️ Multiple exerciseIds for the same name — likely the cause! PR is keyed by exerciseId.')
if would_count == 0 and len(matches) > 0:
    print('   ⚠️ No workouts pass the PR filter — that explains the missing red row.')
PY
rm -f "$ALL_FILE"
