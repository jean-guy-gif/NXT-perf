#!/usr/bin/env bash
# Audit du périmètre manager
set -e

PAGES=(
  "src/app/(dashboard)/manager/cockpit/page.tsx"
  "src/app/(dashboard)/manager/equipe/page.tsx"
  "src/app/(dashboard)/manager/alertes/page.tsx"
  "src/app/(dashboard)/manager/comparaison/page.tsx"
  "src/app/(dashboard)/manager/classement/page.tsx"
  "src/app/(dashboard)/manager/gps/page.tsx"
  "src/app/(dashboard)/manager/formation-collective/page.tsx"
)

echo "Page,LOC,py-20+,rounded-2xl+,shadow-xl+,max-w-7xl,sm: bp,Eyebrow,Card std,Icon wrap,H2 std,H1 hero,CTA princ,Encart prim"

for page in "${PAGES[@]}"; do
  if [ -f "$page" ]; then
    name=$(echo "$page" | sed 's|src/app/||; s|/page.tsx||; s|(\([^)]*\))/||')
    loc=$(wc -l < "$page" | tr -d ' ')
    a1=$(grep -cE 'py-(20|24|32)' "$page" || true)
    a2=$(grep -cE 'rounded-(2xl|3xl)' "$page" || true)
    a3=$(grep -cE 'shadow-(xl|2xl)' "$page" || true)
    a4=$(grep -c 'max-w-7xl' "$page" || true)
    a5=$(grep -c 'sm:' "$page" || true)
    b1=$(grep -c 'bg-primary/10 px-3 py-1' "$page" || true)
    b2=$(grep -c 'rounded-xl border border-border bg-card' "$page" || true)
    b3=$(grep -cE 'h-1[012] w-1[012].*rounded-lg' "$page" || true)
    b4=$(grep -c 'text-3xl font-bold' "$page" || true)
    b5=$(grep -c 'text-4xl.*md:text-5xl' "$page" || true)
    b6=$(grep -c 'bg-primary px-6 py-3' "$page" || true)
    b7=$(grep -c 'border-primary/30 bg-primary/5' "$page" || true)
    echo "$name,$loc,$a1,$a2,$a3,$a4,$a5,$b1,$b2,$b3,$b4,$b5,$b6,$b7"
  else
    name=$(echo "$page" | sed 's|src/app/||; s|/page.tsx||; s|(\([^)]*\))/||')
    echo "$name,MISSING,-,-,-,-,-,-,-,-,-,-,-,-"
  fi
done
