"use client";

import { useMemo, useState } from "react";
import {
  ALL_EXPERTISE_RATIOS,
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import { getTopPractices } from "@/lib/coaching/coach-brain";
import { Send, Sparkles, Database, Loader2 } from "lucide-react";

const EXAMPLE_QUERIES: Array<{ label: string; build: (label: string) => string }> = [
  {
    label: "Pratiques",
    build: (label) =>
      `Donne-moi les 3 actions concrètes les plus impactantes pour qu'un conseiller immobilier améliore son ratio ${label}. Format : 3 puces actionables, sans théorie.`,
  },
  {
    label: "Plan 30j",
    build: (label) =>
      `Génère un plan 30 jours pour qu'un conseiller immobilier améliore son ratio ${label}. Structure : 4 semaines, 3 actions concrètes par semaine, jour par jour si possible.`,
  },
  {
    label: "Plan collectif manager",
    build: (label) =>
      `En tant que coach NXT, donne-moi un plan d'animation équipe sur 4 semaines pour qu'un manager fasse progresser son équipe sur le levier ${label}. Détaille les actions du manager + les actions des conseillers.`,
  },
];

interface RagResponse {
  content: string;
  mode: string;
  retrievalUsed: boolean;
  retrievalChunkCount: number;
  retrievalSynthesisCount: number;
  model: string;
}

export default function CoachComparisonPage() {
  const [expertiseId, setExpertiseId] = useState<ExpertiseRatioId>(
    "contacts_estimations",
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ragResponse, setRagResponse] = useState<RagResponse | null>(null);

  const expertise = RATIO_EXPERTISE[expertiseId];
  const topPractices = useMemo(
    () => getTopPractices(expertiseId, 3),
    [expertiseId],
  );

  function fillExample(buildFn: (label: string) => string) {
    setQuery(buildFn(expertise.label));
  }

  async function runRagQuery() {
    if (!query.trim()) {
      setError("Tape une question d'abord.");
      return;
    }
    setLoading(true);
    setError(null);
    setRagResponse(null);
    try {
      const res = await fetch("/api/coach-brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: query }],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as RagResponse;
      setRagResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold">
          Test Coach — Hardcoded vs RAG Cloud
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare le coach actuel (données expertise hardcodées) au nouveau coach
          RAG (Claude Sonnet 4.5 + corpus NXT-Coach + doctrine méthode).
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Levier (ratio expertise)
            </label>
            <select
              value={expertiseId}
              onChange={(e) =>
                setExpertiseId(e.target.value as ExpertiseRatioId)
              }
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ALL_EXPERTISE_RATIOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => fillExample(ex.build)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                Ex: {ex.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          placeholder="Pose ta question au coach (ou clique un bouton 'Ex:' ci-dessus)..."
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Le coach RAG sera enrichi par retrieval sur le corpus Supabase
            pgvector + doctrine méthode NXT injectée dans le system prompt.
          </p>
          <button
            type="button"
            disabled={loading || !query.trim()}
            onClick={runRagQuery}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Coach RAG en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Comparer
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Erreur : {error}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT — Hardcoded actuel */}
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            Coach actuel — hardcoded
          </div>
          <h2 className="mt-2 text-lg font-bold">{expertise.label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Source : src/data/ratio-expertise.ts + src/lib/coaching/coach-brain.ts (lookup synchrone tables hardcodées)
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Diagnosis
              </p>
              <p className="mt-1 text-sm">{expertise.diagnosis}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Top 3 pratiques (getTopPractices)
              </p>
              <ul className="mt-1 space-y-1 text-sm">
                {topPractices.map((p, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-muted-foreground">{idx + 1}.</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Causes fréquentes
              </p>
              <ul className="mt-1 space-y-1 text-sm">
                {expertise.commonCauses.map((c, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-muted-foreground">·</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Première action concrète
              </p>
              <p className="mt-1 text-sm font-medium">{expertise.firstAction}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Best practices (narratif)
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {expertise.bestPractices}
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT — RAG Coach */}
        <section className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            Coach RAG — Sonnet 4.5 + corpus NXT
          </div>
          <h2 className="mt-2 text-lg font-bold">Réponse contextuelle</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Source : /api/coach-brain/chat → retrieval Supabase pgvector + OpenRouter Claude Sonnet 4.5 + doctrine NXT injectée
          </p>

          {ragResponse ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                  Mode {ragResponse.mode}
                </span>
                <span className="rounded-full bg-card border border-border px-2 py-0.5 text-muted-foreground">
                  Model {ragResponse.model}
                </span>
                <span className="rounded-full bg-card border border-border px-2 py-0.5 text-muted-foreground">
                  {ragResponse.retrievalChunkCount} chunks ·{" "}
                  {ragResponse.retrievalSynthesisCount} syntheses retrieved
                </span>
                {!ragResponse.retrievalUsed && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Corpus vide — RAG sans context
                  </span>
                )}
              </div>
              <div className="whitespace-pre-line rounded-lg border border-indigo-200 bg-card p-3 text-sm leading-relaxed dark:border-indigo-900/40">
                {ragResponse.content}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex h-40 items-center justify-center rounded-lg border border-dashed border-indigo-300/60 bg-card text-sm text-muted-foreground dark:border-indigo-800/40">
              {loading
                ? "Coach RAG en cours d'analyse..."
                : "Tape une question + clique 'Comparer' pour voir la réponse du coach RAG."}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <strong>Note :</strong> tant que l&apos;ingestion <code>npm run ingest:coach-rag</code> n&apos;a pas été lancée, le corpus Supabase est vide → le RAG retourne 0 chunks + 0 syntheses. La réponse RAG reste néanmoins enrichie par la doctrine méthode NXT injectée dans le system prompt + Claude Sonnet 4.5 (qualité &gt; gpt-4o-mini hardcoded).
        </p>
      </section>
    </div>
  );
}
