#!/usr/bin/env bash
#
# Downloads the Whisper English "base" model (ggml-base.en.bin) into
# app/src/main/assets/ so it is bundled with the release APK.
#
# Override the source with WHISPER_MODEL_URL if you host the model internally.
#
set -euo pipefail

MODEL_URL="${WHISPER_MODEL_URL:-https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin}"
DEST="app/src/main/assets/ggml-base.en.bin"

# The base.en model is ~141 MB. Anything dramatically smaller is a truncated
# or error-page download and must fail the build rather than ship a broken APK.
MIN_BYTES=100000000

if [ -f "$DEST" ]; then
  SIZE=$(stat -c%s "$DEST" 2>/dev/null || stat -f%z "$DEST" 2>/dev/null || echo 0)
  if [ "$SIZE" -ge "$MIN_BYTES" ]; then
    echo "Model already present at $DEST ($(du -h "$DEST" | cut -f1)). Skipping download."
    exit 0
  fi
  echo "Existing file at $DEST is only $SIZE bytes (expected >= $MIN_BYTES); re-downloading."
  rm -f "$DEST"
fi

mkdir -p "$(dirname "$DEST")"
echo "Downloading Whisper base.en model from $MODEL_URL"
curl -fL --retry 3 --retry-delay 2 "$MODEL_URL" -o "$DEST"

SIZE=$(stat -c%s "$DEST" 2>/dev/null || stat -f%z "$DEST" 2>/dev/null || echo 0)
if [ "$SIZE" -lt "$MIN_BYTES" ]; then
  echo "::error::Downloaded model is only $SIZE bytes (expected >= $MIN_BYTES). Aborting." >&2
  rm -f "$DEST"
  exit 1
fi
echo "Saved model to $DEST ($(du -h "$DEST" | cut -f1), $SIZE bytes)"
