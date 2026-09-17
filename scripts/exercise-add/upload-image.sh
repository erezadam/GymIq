#!/usr/bin/env bash
# Upload an exercise image to erezadam/exercise-images-en and print the raw URL.
# Usage: upload-image.sh --file <path.webp> --name "<English Name>" [--dry-run]
# Exit codes: 0 ok · 1 usage/missing file · 3 name already exists (no overwrite) · 4 URL not live after push
set -euo pipefail

FILE="" NAME="" DRY_RUN=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --file) FILE="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$FILE" || -z "$NAME" ]]; then
  echo "usage: upload-image.sh --file <path.webp> --name \"<English Name>\" [--dry-run]" >&2
  exit 1
fi
if [[ ! -f "$FILE" ]]; then
  echo "file not found: $FILE" >&2
  exit 1
fi

REPO="$HOME/Projects/exercise-images-en"
if [[ ! -d "$REPO" ]]; then
  gh repo clone erezadam/exercise-images-en "$REPO" >&2
else
  git -C "$REPO" pull --ff-only >&2
fi

TARGET="$REPO/$NAME.webp"
if [[ -e "$TARGET" ]]; then
  echo "already exists in repo, refusing to overwrite: $NAME.webp" >&2
  exit 3
fi

ENCODED_NAME="${NAME// /%20}"
URL="https://raw.githubusercontent.com/erezadam/exercise-images-en/main/${ENCODED_NAME}.webp"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "DRY RUN — would do:" >&2
  echo "  cp \"$FILE\" \"$TARGET\"" >&2
  echo "  git -C \"$REPO\" add \"$NAME.webp\" && commit \"Add exercise image: $NAME\" && push origin main" >&2
  echo "  verify HTTP 200: $URL" >&2
  exit 0
fi

cp "$FILE" "$TARGET"
git -C "$REPO" add "$NAME.webp"
git -C "$REPO" commit -m "Add exercise image: $NAME" >&2
git -C "$REPO" push origin main >&2

for i in 1 2 3 4 5; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -I "$URL")
  if [[ "$CODE" == "200" ]]; then
    echo "$URL"
    exit 0
  fi
  sleep 1
done
echo "URL not live after push (last code: $CODE): $URL" >&2
exit 4
