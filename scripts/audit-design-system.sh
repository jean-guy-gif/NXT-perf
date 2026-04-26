#!/usr/bin/env bash
# Audit grep des pages contre design-system-v2
# Usage: ./scripts/audit-design-system.sh

set -e

PAGES=(
  # Pages conseiller — produit
  "src/app/(dashboard)/dashboard/page.tsx"
  "src/app/(dashboard)/formation/page.tsx"
  "src/app/(dashboard)/resultats/page.tsx"
  "src/app/(dashboard)/performance/page.tsx"
  "src/app/(dashboard)/comparaison/page.tsx"
  "src/app/(dashboard)/saisie/page.tsx"
  "src/app/(dashboard)/objectifs/page.tsx"
  "src/app/(dashboard)/notifications/page.tsx"
  "src/app/(dashboard)/coaching-debrief/page.tsx"
  # Pages conseiller — DPI
  "src/app/(dashboard)/dpi/page.tsx"
  "src/app/(public)/dpi/page.tsx"
  "src/app/(public)/dpi/questionnaire/page.tsx"
  "src/app/(public)/dpi/resultats/page.tsx"
  # Pages conseiller — onboarding
  "src/app/onboarding/identite/page.tsx"
  "src/app/onboarding/dpi/page.tsx"
  "src/app/onboarding/gps/page.tsx"
  "src/app/onboarding/coach/page.tsx"
  # Pages conseiller — paramètres perso
  "src/app/(dashboard)/parametres/page.tsx"
  "src/app/(dashboard)/parametres/profil/page.tsx"
  "src/app/(dashboard)/parametres/voix/page.tsx"
  # Pages conseiller — auth & souscription
  "src/app/(auth)/welcome/page.tsx"
  "src/app/(auth)/login/page.tsx"
  "src/app/(auth)/register/page.tsx"
  "src/app/(auth)/forgot-password/page.tsx"
  "src/app/(auth)/reset-password/page.tsx"
  "src/app/souscrire/page.tsx"
)

# En-tête
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
