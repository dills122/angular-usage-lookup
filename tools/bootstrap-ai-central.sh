#!/bin/sh
# Restore this project's selected local AI Central links without updating the source.
set -eu

case "$#:${1:-}" in
  0:) preview=false ;;
  1:--dry-run) preview=true ;;
  *) echo "Usage: sh tools/bootstrap-ai-central.sh [--dry-run]" >&2; exit 2 ;;
esac

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
central_root=${AI_CENTRAL_HOME:-}
if [ -z "$central_root" ]; then
  if [ -f "$project_root/../ai-central/templates/catalog.json" ]; then
    central_root=$project_root/../ai-central
  else
    central_root=$HOME/.ai-central
  fi
fi
central_root=${central_root%/}
case "$central_root" in */templates) central_root=${central_root%/templates} ;; esac
if [ ! -f "$central_root/templates/catalog.json" ] ||
   [ ! -f "$central_root/scripts/setup-ai-context.sh" ]; then
  echo "Set AI_CENTRAL_HOME to an existing AI Central checkout or its templates directory." >&2
  exit 1
fi
central_root=$(CDPATH= cd -- "$central_root" && pwd -P)
actual_root=$(git -C "$project_root" rev-parse --show-toplevel)
if [ "$actual_root" != "$project_root" ]; then
  echo "Initialize Git in $project_root before bootstrapping." >&2
  exit 1
fi

set -- "$project_root" --yes --mode link
if [ "$preview" = true ]; then
  set -- "$@" --dry-run
fi
sh "$central_root/scripts/setup-ai-context.sh" "$@"
if [ "$preview" = true ]; then
  echo "Apply also locally excludes verified AI Central skill links from Git."
  exit 0
fi

exclude_file=$(git -C "$project_root" rev-parse --path-format=absolute --git-path info/exclude)
mkdir -p "$(dirname -- "$exclude_file")"
touch "$exclude_file"
for link in "$project_root"/.agents/skills/* "$project_root"/.codex/skills/* "$project_root"/.codex/steering/*; do
  [ -L "$link" ] || continue
  resolved=$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$link")
  case "$resolved" in "$central_root"/templates/*) ;; *) continue ;; esac
  if [ -d "$resolved" ]; then
    [ -f "$resolved/SKILL.md" ] || { echo "Missing SKILL.md: $link" >&2; exit 1; }
  else
    [ -f "$resolved" ] || { echo "Missing steering: $link" >&2; exit 1; }
  fi
  relative=${link#"$project_root"/}
  if git -C "$project_root" ls-files --error-unmatch -- "$relative" >/dev/null 2>&1; then
    echo "Preserved tracked skill path: $relative" >&2
    continue
  fi
  pattern=/$relative
  if ! grep -Fqx -- "$pattern" "$exclude_file"; then
    printf '\n%s\n' "$pattern" >> "$exclude_file"
  fi
done
printf 'AI Central links restored from %s\n' "$central_root"
