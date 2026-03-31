# NXT Vocal — Plan d'implémentation

## Résumé

Ajouter un mode de saisie vocale guidé dans NXT Performance. L'agent immobilier répond à 4 questions vocales (une par section : prospection, vendeurs, acheteurs, ventes). Chaque réponse est transcrite par Whisper (via Groq, gratuit) puis structurée par Claude (via OpenRouter) en JSON conforme au schéma `PeriodResults`. L'agent valide le récap pré-rempli en un tap.

## Décisions de design validées

- **Mode guidé par section** : NXT pose 1 question ouverte par section, l'agent répond librement
- **Bouton micro** visible sur le Dashboard ET la page Saisie
- **Pas de contrainte horaire** : l'agent fait son bilan quand il veut
- **TTS optionnel** : l'agent choisit si NXT lit les questions à voix haute
- **Feedback configurable** : données extraites après chaque réponse OU récap global à la fin
- **Confirmation "rien"** : si l'agent dit "rien" sur une section, NXT demande confirmation avant de passer
- **Relance intelligente** : si le LLM détecte une ambiguïté (ex: mandat sans préciser simple/exclusif), l'UI affiche une mini-question de relance

## Stack technique vocal

| Composant | Service | Coût |
|-----------|---------|------|
| Transcription audio → texte | Groq Whisper (`whisper-large-v3`) | Gratuit (quota : ~5h/jour) |
| Extraction texte → JSON | Claude via OpenRouter (`anthropic/claude-3.5-haiku`) | ~0.003€/appel |
| SDK unique | `openai` (npm) avec baseURL custom | — |

## Prérequis

### Variables d'environnement (dans `.env.local`)

```env
# NXT Vocal - Transcription (Groq Whisper gratuit)
GROQ_API_KEY=gsk_...

# NXT Vocal - Extraction LLM (Claude via OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-...
```

### Dépendance unique à installer

```bash
npm install openai
```

> On utilise le SDK `openai` pour les deux services (Groq et OpenRouter) en changeant uniquement le `baseURL`. Pas besoin de `@anthropic-ai/sdk`.

---

## Fichiers à créer

### 1. `src/lib/vocal-prompts.ts` — Prompts système par section

Ce fichier contient les prompts système pour chaque section. Chaque prompt :
- Décrit le contexte métier immobilier
- Spécifie le schéma JSON de sortie exact
- Donne des règles d'extraction spécifiques au vocabulaire terrain
- Distingue `null` (non mentionné) de `0` (explicitement zéro)
- Peut renvoyer un champ `needs_clarification` si une ambiguïté est détectée

```typescript
export type VocalSection = "prospection" | "vendeurs" | "acheteurs" | "ventes";

export const SECTION_QUESTIONS: Record<VocalSection, string> = {
  prospection: "Prospection : combien de contacts et de RDVs aujourd'hui ?",
  vendeurs: "Vendeurs : des estimations, mandats ou suivis ?",
  acheteurs: "Acheteurs : des visites ou des offres ?",
  ventes: "Ventes : des compromis ou des actes signés ?",
};

export const SECTION_ORDER: VocalSection[] = [
  "prospection",
  "vendeurs",
  "acheteurs",
  "ventes",
];

export function getSystemPrompt(section: VocalSection): string {
  const baseContext = `Tu es un assistant spécialisé en immobilier français. Tu extrais des données d'activité à partir d'un bilan vocal d'un agent immobilier.

RÈGLES GÉNÉRALES :
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte autour.
- Si un champ n'est pas mentionné par l'agent, mets null (PAS 0).
- Si l'agent dit explicitement "zéro", "aucun", "pas de", mets 0.
- Si l'agent dit "rien", "rien aujourd'hui", "pas d'activité", mets TOUS les champs à null et ajoute "all_null": true.
- Extrais les noms propres mentionnés (vendeurs, acheteurs) avec leur contexte.
- Si une information est ambiguë, ajoute-la dans "needs_clarification".
- Les nombres en français oral : "une dizaine" = 10, "une quinzaine" = 15, "une vingtaine" = 20.`;

  const schemas: Record<VocalSection, string> = {
    prospection: `${baseContext}

SECTION : PROSPECTION
Tu extrais les données de prospection de l'agent.

SCHÉMA DE SORTIE :
{
  "contactsEntrants": number | null,
  "contactsTotaux": number | null,
  "rdvEstimation": number | null,
  "informationsVente": [
    { "nom": string, "commentaire": string }
  ],
  "needs_clarification": [
    { "field": string, "question": string }
  ],
  "all_null": boolean
}

RÈGLES SPÉCIFIQUES :
- "appels de prospection", "appels", "coups de fil" → comptent dans contactsTotaux (pas entrants)
- "contacts SeLoger", "contacts portail", "contacts site" → contactsEntrants
- Si l'agent donne contactsTotaux et contactsEntrants, vérifier que totaux >= entrants
- Si l'agent ne donne que les appels de prospection + entrants, contactsTotaux = appels + entrants
- "RDV estimation", "estimé chez", "allé estimer" → rdvEstimation
- Un nom propre + contexte de vente → informationsVente`,

    vendeurs: `${baseContext}

SECTION : VENDEURS
Tu extrais les données vendeurs de l'agent.

SCHÉMA DE SORTIE :
{
  "estimationsRealisees": number | null,
  "mandatsSignes": number | null,
  "mandats": [
    { "nomVendeur": string, "type": "simple" | "exclusif" }
  ],
  "rdvSuivi": number | null,
  "requalificationSimpleExclusif": number | null,
  "baissePrix": number | null,
  "needs_clarification": [
    { "field": string, "question": string }
  ],
  "all_null": boolean
}

RÈGLES SPÉCIFIQUES :
- "signé un mandat" sans préciser le type → ajouter dans needs_clarification : "Le mandat [nom], c'est un simple ou un exclusif ?"
- "requalification", "passé en exclusif", "transformé en exclusif" → requalificationSimpleExclusif
- "baisse de prix", "ajustement prix", "le vendeur a accepté de baisser" → baissePrix
- "RDV suivi", "suivi vendeur", "point avec le vendeur" → rdvSuivi
- mandatsSignes doit correspondre au nombre d'éléments dans mandats[]`,

    acheteurs: `${baseContext}

SECTION : ACHETEURS
Tu extrais les données acheteurs de l'agent.

SCHÉMA DE SORTIE :
{
  "acheteursChauds": [
    { "nom": string, "commentaire": string }
  ],
  "acheteursSortisVisite": number | null,
  "nombreVisites": number | null,
  "offresRecues": number | null,
  "compromisSignes": number | null,
  "needs_clarification": [
    { "field": string, "question": string }
  ],
  "all_null": boolean
}

RÈGLES SPÉCIFIQUES :
- "va faire une offre", "très intéressé", "prêt à acheter" → acheteursChauds
- Distinguer acheteursSortisVisite (nb de personnes) vs nombreVisites (nb de visites, peut être > personnes)
- Si l'agent dit "2 visites" sans préciser le nb d'acheteurs, mettre acheteursSortisVisite = null et nombreVisites = 2
- "offre" = offre écrite formalisée uniquement, pas une intention verbale
- "compromis", "sous compromis", "signé le compromis" → compromisSignes`,

    ventes: `${baseContext}

SECTION : VENTES
Tu extrais les données de ventes de l'agent.

SCHÉMA DE SORTIE :
{
  "actesSignes": number | null,
  "chiffreAffaires": number | null,
  "delaiMoyenVente": number | null,
  "needs_clarification": [
    { "field": string, "question": string }
  ],
  "all_null": boolean
}

RÈGLES SPÉCIFIQUES :
- "acte", "acte authentique", "signé chez le notaire" → actesSignes
- CA en euros, arrondir au nombre entier
- "rien", "rien aujourd'hui", "pas de vente" → all_null: true`,
  };

  return schemas[section];
}
```

### 2. `src/app/api/vocal/route.ts` — API Route orchestrateur

Cette route reçoit un blob audio + le nom de la section, appelle Whisper (Groq) puis Claude (OpenRouter), et renvoie le JSON structuré.

```typescript
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSystemPrompt, type VocalSection, SECTION_ORDER } from "@/lib/vocal-prompts";

// Whisper via Groq (gratuit, ~5h/jour)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Claude via OpenRouter
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as Blob | null;
    const section = formData.get("section") as VocalSection | null;

    if (!audioBlob || !section || !SECTION_ORDER.includes(section)) {
      return NextResponse.json(
        { error: "Missing audio or invalid section" },
        { status: 400 }
      );
    }

    // ── Étape 1 : Transcription via Groq Whisper (gratuit) ──
    const audioFile = new File([audioBlob], "vocal.webm", {
      type: audioBlob.type || "audio/webm",
    });

    const transcription = await groq.audio.transcriptions.create({
      model: "whisper-large-v3",
      file: audioFile,
      language: "fr",
    });

    const transcript = transcription.text;

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "Transcription vide", transcript: "" },
        { status: 400 }
      );
    }

    // ── Étape 2 : Extraction structurée via Claude (OpenRouter) ──
    const systemPrompt = getSystemPrompt(section);

    const completion = await openrouter.chat.completions.create({
      model: "anthropic/claude-3.5-haiku",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Voici le bilan vocal de l'agent pour la section "${section}" :\n\n"${transcript}"`,
        },
      ],
      max_tokens: 1024,
    });

    const rawContent = completion.choices?.[0]?.message?.content ?? "";

    // Parser le JSON (gérer les cas où Claude ajoute du texte autour)
    let extracted;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        {
          error: "Erreur de parsing JSON",
          transcript,
          rawContent,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transcript,
      extracted,
      section,
    });
  } catch (error) {
    console.error("[vocal] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Erreur serveur", details: message },
      { status: 500 }
    );
  }
}
```

### 3. `src/hooks/use-vocal-recorder.ts` — Hook d'enregistrement audio

Hook React qui gère le cycle d'enregistrement via MediaRecorder API.

```typescript
import { useState, useRef, useCallback } from "react";

interface UseVocalRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
}

export function useVocalRecorder(): UseVocalRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Impossible d'accéder au microphone. Vérifiez les permissions.");
      console.error("[vocal] Mic access error:", err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, []);

  return { isRecording, startRecording, stopRecording, error };
}
```

### 4. `src/hooks/use-vocal-flow.ts` — Hook orchestrateur du flow vocal

Ce hook orchestre le flow complet : progression dans les sections, appels API, accumulation des données extraites.

```typescript
import { useState, useCallback } from "react";
import { SECTION_ORDER, SECTION_QUESTIONS, type VocalSection } from "@/lib/vocal-prompts";

interface ExtractedData {
  [key: string]: unknown;
}

interface SectionResult {
  section: VocalSection;
  transcript: string;
  extracted: ExtractedData;
  needsClarification: Array<{ field: string; question: string }>;
  allNull: boolean;
}

type FlowStep = "intro" | "recording" | "processing" | "review" | "confirm_null" | "clarification" | "recap" | "done";

interface VocalFlowState {
  step: FlowStep;
  currentSectionIndex: number;
  results: SectionResult[];
  settings: {
    ttsEnabled: boolean;
    realtimeFeedback: boolean;
  };
}

export type { SectionResult, FlowStep };

export function useVocalFlow() {
  const [state, setState] = useState<VocalFlowState>({
    step: "intro",
    currentSectionIndex: 0,
    results: [],
    settings: {
      ttsEnabled: false,
      realtimeFeedback: true,
    },
  });

  const currentSection = SECTION_ORDER[state.currentSectionIndex] ?? null;
  const currentQuestion = currentSection
    ? SECTION_QUESTIONS[currentSection]
    : null;
  const isLastSection =
    state.currentSectionIndex >= SECTION_ORDER.length - 1;

  const updateSettings = useCallback(
    (partial: Partial<VocalFlowState["settings"]>) => {
      setState((s) => ({
        ...s,
        settings: { ...s.settings, ...partial },
      }));
    },
    []
  );

  const startFlow = useCallback(() => {
    setState((s) => ({ ...s, step: "recording", currentSectionIndex: 0, results: [] }));
  }, []);

  const setProcessing = useCallback(() => {
    setState((s) => ({ ...s, step: "processing" }));
  }, []);

  const submitSectionResult = useCallback(
    (result: SectionResult) => {
      setState((s) => {
        const newResults = [...s.results, result];

        // Si "rien" → demander confirmation
        if (result.allNull) {
          return { ...s, results: newResults, step: "confirm_null" };
        }

        // Si relance nécessaire → afficher les questions de clarification
        if (result.needsClarification.length > 0) {
          return { ...s, results: newResults, step: "clarification" };
        }

        // Si feedback temps réel → afficher le review
        if (s.settings.realtimeFeedback) {
          return { ...s, results: newResults, step: "review" };
        }

        // Sinon → passer à la section suivante ou au récap
        if (s.currentSectionIndex >= SECTION_ORDER.length - 1) {
          return { ...s, results: newResults, step: "recap" };
        }

        return {
          ...s,
          results: newResults,
          currentSectionIndex: s.currentSectionIndex + 1,
          step: "recording",
        };
      });
    },
    []
  );

  const nextSection = useCallback(() => {
    setState((s) => {
      if (s.currentSectionIndex >= SECTION_ORDER.length - 1) {
        return { ...s, step: "recap" };
      }
      return {
        ...s,
        currentSectionIndex: s.currentSectionIndex + 1,
        step: "recording",
      };
    });
  }, []);

  const confirmAll = useCallback(() => {
    setState((s) => ({ ...s, step: "done" }));
  }, []);

  const reset = useCallback(() => {
    setState({
      step: "intro",
      currentSectionIndex: 0,
      results: [],
      settings: { ttsEnabled: false, realtimeFeedback: true },
    });
  }, []);

  // Appel API vocal (Groq Whisper + Claude OpenRouter)
  const processAudio = useCallback(
    async (audioBlob: Blob): Promise<SectionResult> => {
      if (!currentSection) throw new Error("No current section");

      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("section", currentSection);

      const res = await fetch("/api/vocal", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erreur API vocal");
      }

      const data = await res.json();

      return {
        section: data.section,
        transcript: data.transcript,
        extracted: data.extracted,
        needsClarification: data.extracted?.needs_clarification ?? [],
        allNull: data.extracted?.all_null ?? false,
      };
    },
    [currentSection]
  );

  return {
    state,
    currentSection,
    currentQuestion,
    isLastSection,
    updateSettings,
    startFlow,
    setProcessing,
    submitSectionResult,
    nextSection,
    confirmAll,
    reset,
    processAudio,
  };
}
```

### 5. `src/lib/vocal-mapping.ts` — Mapping vocal → PeriodResults

Convertit les résultats du flow vocal en structure `PeriodResults` compatible avec le formulaire de saisie existant.

```typescript
import type { PeriodResults } from "@/types/results";
import type { SectionResult } from "@/hooks/use-vocal-flow";

export function mapVocalToResults(
  vocalResults: SectionResult[]
): Partial<PeriodResults> {
  const result: Partial<PeriodResults> = {};

  for (const sr of vocalResults) {
    if (sr.allNull) continue;

    const d = sr.extracted;

    switch (sr.section) {
      case "prospection":
        result.prospection = {
          contactsEntrants: (d.contactsEntrants as number) ?? 0,
          contactsTotaux: (d.contactsTotaux as number) ?? 0,
          rdvEstimation: (d.rdvEstimation as number) ?? 0,
          informationsVente: (
            (d.informationsVente as Array<{ nom: string; commentaire: string }>) ?? []
          ).map((iv, i) => ({
            id: `iv-vocal-${i}`,
            nom: iv.nom,
            commentaire: iv.commentaire,
            statut: "en_cours" as const,
          })),
        };
        break;

      case "vendeurs":
        result.vendeurs = {
          rdvEstimation: (d.estimationsRealisees as number) ?? 0,
          estimationsRealisees: (d.estimationsRealisees as number) ?? 0,
          mandatsSignes: (d.mandatsSignes as number) ?? 0,
          mandats: (
            (d.mandats as Array<{ nomVendeur: string; type: string }>) ?? []
          ).map((m, i) => ({
            id: `m-vocal-${i}`,
            nomVendeur: m.nomVendeur,
            type: m.type as "simple" | "exclusif",
          })),
          rdvSuivi: (d.rdvSuivi as number) ?? 0,
          requalificationSimpleExclusif:
            (d.requalificationSimpleExclusif as number) ?? 0,
          baissePrix: (d.baissePrix as number) ?? 0,
        };
        break;

      case "acheteurs":
        result.acheteurs = {
          acheteursChauds: (
            (d.acheteursChauds as Array<{ nom: string; commentaire: string }>) ?? []
          ).map((ac, i) => ({
            id: `ac-vocal-${i}`,
            nom: ac.nom,
            commentaire: ac.commentaire,
            statut: "en_cours" as const,
          })),
          acheteursSortisVisite: (d.acheteursSortisVisite as number) ?? 0,
          nombreVisites: (d.nombreVisites as number) ?? 0,
          offresRecues: (d.offresRecues as number) ?? 0,
          compromisSignes: (d.compromisSignes as number) ?? 0,
        };
        break;

      case "ventes":
        result.ventes = {
          actesSignes: (d.actesSignes as number) ?? 0,
          chiffreAffaires: (d.chiffreAffaires as number) ?? 0,
          delaiMoyenVente: (d.delaiMoyenVente as number) ?? 0,
        };
        break;
    }
  }

  return result;
}
```

### 6. `src/components/vocal/VocalButton.tsx` — Bouton micro

```typescript
"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { VocalFlow } from "./VocalFlow";

interface VocalButtonProps {
  className?: string;
}

export function VocalButton({ className }: VocalButtonProps) {
  const [showFlow, setShowFlow] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowFlow(true)}
        className={cn(
          "flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          className
        )}
      >
        <Mic className="h-4 w-4" />
        Bilan vocal
      </button>
      {showFlow && <VocalFlow onClose={() => setShowFlow(false)} />}
    </>
  );
}
```

### 7. `src/components/vocal/VocalFlow.tsx` — Composant UI principal

C'est le plus gros composant à implémenter. Il orchestre l'UI du flow vocal en modal overlay.

Points clés d'implémentation :
- Utilise `useVocalFlow()` pour la logique métier
- Utilise `useVocalRecorder()` pour l'enregistrement audio
- Affiché en modal overlay (`fixed inset-0 z-50 bg-black/50`)
- Reçoit `onClose: () => void` et optionnellement `onComplete: (data: Partial<PeriodResults>) => void`
- Affiche une étape à la fois selon `state.step`
- Barre de progression en haut : 4 dots (gris = à venir, orange = en cours, vert = fait)
- Le bouton micro pulse pendant l'enregistrement (`animate-pulse`)
- L'étape "confirm_null" : bandeau warning "Aucune activité [section], c'est bien ça ?" + 2 boutons
- L'étape "clarification" : affiche les questions de `needs_clarification` avec input texte pour répondre
- L'étape "review" : données extraites en KV pairs, chaque valeur est cliquable pour corriger
- L'étape "recap" : 4 cartes (une par section) avec le résumé de toutes les données
- L'étape "done" : check vert + message "Bilan enregistré" + bouton vers dashboard
- Quand `step === "done"`, appeler `onComplete(mapVocalToResults(state.results))`
- Design system : `bg-card`, `border-border`, `text-foreground`, `rounded-xl`, icônes Lucide
- Référence modal existant : `ImportDataModal` dans `src/components/layout/header.tsx`

Structure du composant :
```
<div overlay fixed inset-0 z-50 bg-black/50>
  <div modal card max-w-lg mx-auto>
    <header> "NXT Vocal" + "2/7" + bouton X fermer </header>
    <progress dots />
    <body flex-1 overflow-y-auto>
      {step === "intro" && <IntroScreen />}
      {step === "recording" && <RecordingScreen />}
      {step === "processing" && <Loader2 animate-spin />}
      {step === "confirm_null" && <ConfirmNullScreen />}
      {step === "clarification" && <ClarificationScreen />}
      {step === "review" && <ReviewScreen />}
      {step === "recap" && <RecapScreen />}
      {step === "done" && <DoneScreen />}
    </body>
    <footer> boutons Retour / Suivant </footer>
  </div>
</div>
```

---

## Fichiers à modifier

### `src/app/(dashboard)/saisie/page.tsx`

Ajouter le VocalButton à côté du titre "Ma Saisie" :

```typescript
import { VocalButton } from "@/components/vocal/VocalButton";

// Dans le JSX header :
<div className="flex items-center gap-3">
  <h1 className="text-2xl font-bold text-foreground">Ma Saisie</h1>
  <VocalButton />
</div>
```

Quand le flow vocal se termine, les résultats pré-remplissent le formulaire. Le `VocalFlow` reçoit un callback `onComplete(data)` qui met à jour le state local du formulaire de saisie.

### `src/app/(dashboard)/dashboard/page.tsx`

Ajouter le VocalButton dans le header du dashboard :

```typescript
import { VocalButton } from "@/components/vocal/VocalButton";

// Dans le header
<VocalButton className="ml-auto" />
```

---

## Estimation des coûts par bilan vocal

| Étape | Service | Coût estimé |
|-------|---------|-------------|
| Whisper (4 × 30s audio) | Groq | **Gratuit** |
| Claude Haiku (4 × ~200 tokens) | OpenRouter | ~0.003€ |
| **Total par bilan** | | **~0.003€** |
| 1 agent × 22 jours/mois | | ~0.07€/mois |
| Agence 5 agents | | ~0.33€/mois |

---

## Ordre d'implémentation recommandé

1. **`src/lib/vocal-prompts.ts`** — les prompts et constantes (aucune dépendance)
2. **`src/app/api/vocal/route.ts`** — l'API route Groq + OpenRouter (tester avec curl)
3. **`src/hooks/use-vocal-recorder.ts`** — le hook d'enregistrement audio
4. **`src/hooks/use-vocal-flow.ts`** — le hook orchestrateur
5. **`src/lib/vocal-mapping.ts`** — le mapping vocal → PeriodResults
6. **`src/components/vocal/VocalButton.tsx`** — le bouton de déclenchement
7. **`src/components/vocal/VocalFlow.tsx`** — le composant UI principal (le plus gros morceau)
8. **Intégration** dans `saisie/page.tsx` et `dashboard/page.tsx`
9. **Tests** manuels end-to-end

---

## Prompt Claude Code

Voici l'instruction à donner à Claude Code pour lancer l'implémentation :

```
Lis le fichier docs/plans/2026-03-30-vocal-flow-implementation.md et implémente le flow vocal NXT dans l'ordre recommandé (section "Ordre d'implémentation recommandé").

Contexte technique :
- Transcription audio : Groq Whisper (gratuit), clé dans GROQ_API_KEY, baseURL https://api.groq.com/openai/v1
- Extraction LLM : Claude via OpenRouter, clé dans OPENROUTER_API_KEY, baseURL https://openrouter.ai/api/v1
- SDK unique : npm openai avec baseURL custom pour les deux services
- Pas besoin de @anthropic-ai/sdk

Commence par vocal-prompts.ts, puis l'API route, puis les hooks, puis les composants UI.
Suis le design system existant (Tailwind, Lucide, cn() pour les classes conditionnelles).
Le composant VocalFlow est un modal overlay qui suit le même pattern que ImportDataModal dans src/components/layout/header.tsx.
```

---

## Tests

### Test de l'API route (curl)

```bash
curl -X POST http://localhost:3000/api/vocal \
  -F "audio=@test-vocal.webm" \
  -F "section=prospection"
```

### Scénarios de test vocal

1. **Prospection complète** : "J'ai fait 12 appels, 3 contacts SeLoger, un RDV estimation chez Mme Dupont rue Gambetta"
   → contactsEntrants=3, contactsTotaux=15, rdvEstimation=1, informationsVente=[Mme Dupont]

2. **Vendeurs avec ambiguïté** : "J'ai signé un mandat avec M. Martin"
   → mandatsSignes=1, needs_clarification=[{question: "Simple ou exclusif ?"}]

3. **Section vide** : "Rien aujourd'hui"
   → all_null=true → UI affiche "Aucune activité, c'est bien ça ?"

4. **Acheteurs mixte** : "2 visites, le couple Martin va faire une offre"
   → nombreVisites=2, acheteursChauds=[{nom: "Couple Martin"}]

5. **Nombres approximatifs** : "Une dizaine d'appels et quelques contacts entrants"
   → contactsTotaux≈10, needs_clarification pour contactsEntrants

---

## Variables d'environnement Vercel (production)

Dans Vercel > Settings > Environment Variables :

```
GROQ_API_KEY=gsk_...         (clé Groq régénérée)
OPENROUTER_API_KEY=sk-or-... (clé OpenRouter régénérée)
```