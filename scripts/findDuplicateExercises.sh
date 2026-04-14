#!/usr/bin/env bash
# Dry-run: find duplicate exercises in the exercises collection.
# Detects:
#  (A) Identical normalized name (trim + collapse whitespace + lowercase)
#  (B) Same primaryMuscle + equipment + Jaccard word-overlap > 0.5 (likely duplicates)
#
# For each cluster, also reports usage count in workoutHistory (per exerciseId) so
# you can choose the canonical ID (typically the most-used one).
#
# Usage: scripts/findDuplicateExercises.sh
set -e
PROJECT="gymiq-e8b4e"
TOKEN=$(gcloud auth application-default print-access-token)
BASE="https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)"

EXFILE=$(mktemp)
HISTFILE=$(mktemp)

echo "📥 Fetching all exercises..."
PAGE_TOKEN=""
> "$EXFILE"
while :; do
  if [ -z "$PAGE_TOKEN" ]; then
    RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "${BASE}/documents/exercises?pageSize=300")
  else
    RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "${BASE}/documents/exercises?pageSize=300&pageToken=${PAGE_TOKEN}")
  fi
  echo "$RESP" | jq -c . >> "$EXFILE"
  PAGE_TOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('nextPageToken',''))" 2>/dev/null || echo "")
  [ -z "$PAGE_TOKEN" ] && break
done
EX_TOTAL=$(python3 -c "
import json,sys
total=0
for line in open('$EXFILE'):
    if not line.strip(): continue
    d=json.loads(line)
    total += len(d.get('documents', []))
print(total)
")
echo "  → $EX_TOTAL exercise docs"

echo "📥 Fetching all workoutHistory (exerciseId usage counts)..."
PAGE_TOKEN=""
> "$HISTFILE"
while :; do
  if [ -z "$PAGE_TOKEN" ]; then
    RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "${BASE}/documents/workoutHistory?pageSize=300")
  else
    RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "${BASE}/documents/workoutHistory?pageSize=300&pageToken=${PAGE_TOKEN}")
  fi
  echo "$RESP" | jq -c . >> "$HISTFILE"
  PAGE_TOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('nextPageToken',''))" 2>/dev/null || echo "")
  [ -z "$PAGE_TOKEN" ] && break
done

python3 - "$EXFILE" "$HISTFILE" <<'PY'
import sys, json, re
from collections import defaultdict, Counter

ex_path, hist_path = sys.argv[1], sys.argv[2]

def f(d, k):
    v = d.get('fields', {}).get(k)
    if not v: return None
    if 'stringValue' in v: return v['stringValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'doubleValue' in v: return float(v['doubleValue'])
    if 'booleanValue' in v: return v['booleanValue']
    return None

def normalize(s):
    if not s: return ''
    return re.sub(r'\s+', ' ', s.strip()).lower()

HEB_PREFIXES = ('ב', 'ל', 'ה', 'ו', 'מ', 'ש', 'כ')
def strip_heb_prefix(w):
    # Strip a single common Hebrew letter-prefix when the remainder is still meaningful (>=3 chars)
    if len(w) >= 4 and w[0] in HEB_PREFIXES:
        return w[1:]
    return w

def words(s):
    n = normalize(s)
    n = re.sub(r'[(),.\-_/]', ' ', n)
    raw = [w for w in n.split() if len(w) > 1]
    # Add prefix-stripped variant of each word so "במכונה" matches "מכונה"
    expanded = set()
    for w in raw:
        expanded.add(w)
        expanded.add(strip_heb_prefix(w))
    return expanded

# Load exercises
exercises = []
for line in open(ex_path):
    if not line.strip(): continue
    d = json.loads(line)
    for doc in d.get('documents', []):
        ex_id = doc['name'].split('/')[-1]
        exercises.append({
            'id': ex_id,
            'nameHe': f(doc, 'nameHe') or f(doc, 'exerciseNameHe'),
            'name': f(doc, 'name') or f(doc, 'exerciseName'),
            'primaryMuscle': f(doc, 'primaryMuscle'),
            'category': f(doc, 'category'),
            'equipment': f(doc, 'equipment'),
        })

# Count usage per exerciseId in workoutHistory
usage = Counter()
for line in open(hist_path):
    if not line.strip(): continue
    d = json.loads(line)
    for doc in d.get('documents', []):
        exs = doc.get('fields', {}).get('exercises', {}).get('arrayValue', {}).get('values', [])
        for e in exs:
            ex_id = e.get('mapValue', {}).get('fields', {}).get('exerciseId', {}).get('stringValue')
            if ex_id: usage[ex_id] += 1

print(f"📚 Loaded {len(exercises)} exercises, {len(usage)} distinct exerciseIds referenced in history")
print()

# Cluster A: identical normalized name
by_norm = defaultdict(list)
for ex in exercises:
    n = normalize(ex['nameHe'])
    if n: by_norm[n].append(ex)

cluster_a = [(n, lst) for n, lst in by_norm.items() if len(lst) > 1]
print(f"🟥 Cluster A — IDENTICAL normalized name: {len(cluster_a)} clusters")
for n, lst in sorted(cluster_a, key=lambda x: -sum(usage.get(e['id'], 0) for e in x[1])):
    print(f"\n  📛 \"{n}\"  ({len(lst)} dupes)")
    for ex in sorted(lst, key=lambda e: -usage.get(e['id'], 0)):
        print(f"     • id={ex['id']}  uses={usage.get(ex['id'],0):3d}  primaryMuscle={ex['primaryMuscle']}  equipment={ex['equipment']}  nameHe=\"{ex['nameHe']}\"")

# Cluster B: same primaryMuscle + equipment + Jaccard > 0.5 (and NOT already in cluster A)
print()
print(f"🟧 Cluster B — Same primaryMuscle+equipment + word overlap > 0.5 (likely-duplicates):")
already_paired = set()
for n, lst in cluster_a:
    for ex in lst: already_paired.add(ex['id'])

bucket_pe = defaultdict(list)
for ex in exercises:
    key = (ex['primaryMuscle'], ex['equipment'])
    if key[0] is None: continue
    bucket_pe[key].append(ex)

shown = 0
for (pm, eq), lst in bucket_pe.items():
    if len(lst) < 2: continue
    # pairwise within bucket
    pairs = []
    for i in range(len(lst)):
        for j in range(i+1, len(lst)):
            a, b = lst[i], lst[j]
            wa, wb = words(a['nameHe']), words(b['nameHe'])
            if not wa or not wb: continue
            jac = len(wa & wb) / max(1, len(wa | wb))
            if jac >= 0.4 and normalize(a['nameHe']) != normalize(b['nameHe']):
                pairs.append((jac, a, b))
    pairs.sort(key=lambda p: -p[0])
    for jac, a, b in pairs:
        ua, ub = usage.get(a['id'], 0), usage.get(b['id'], 0)
        if ua == 0 and ub == 0: continue  # skip purely unused pairs
        shown += 1
        print(f"\n  🔸 jaccard={jac:.2f}  primaryMuscle={pm}  equipment={eq}")
        print(f"     • id={a['id']}  uses={ua:3d}  nameHe=\"{a['nameHe']}\"")
        print(f"     • id={b['id']}  uses={ub:3d}  nameHe=\"{b['nameHe']}\"")
print(f"\n  → {shown} likely-duplicate pairs shown (skipped pairs where both unused)")

print()
print("═════════════════════════════════════════")
print("ℹ️  Dry-run only. No data was modified.")
print("ℹ️  To merge a cluster, decide canonical id (typically highest 'uses')")
print("    and run the (separate) migration script with explicit input.")
PY

rm -f "$EXFILE" "$HISTFILE"
