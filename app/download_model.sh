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

if [ -f "$DEST" ] && [ -s "$DEST" ]; then
  echo "Model already present at $DEST ($(du -h "$DEST" | cut -f1)). Skipping download."
  exit 0
fi

mkdir -p "$(dirname "$DEST")"
echo "Downloading Whisper base.en model from $MODEL_URL"
curl -fL --retry 3 --retry-delay 2 "$MODEL_URL" -o "$DEST"
echo "Saved model to $DEST ($(du -h "$DEST" | cut -f1))"
