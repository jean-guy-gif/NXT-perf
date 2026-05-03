"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { IndividualCoachingSlides } from "./individual-coaching-slides";
import {
  buildIndividualCoachingKit,
  type IndividualCoachingInput,
} from "@/lib/coaching/individual-coaching-kit";
import { serializeKitToMarkdown } from "@/lib/coaching/team-activation-kit";
import { useCoachingPattern } from "@/hooks/use-coaching-pattern";

// `patternOverride` est piloté en interne via `useCoachingPattern`. On
// retire la prop de la surface publique pour garder l'API simple côté caller.
type Props = Omit<IndividualCoachingInput, "patternOverride">;

/**
 * IndividualCoachingPrep — bloc "Préparer mon coaching individuel"
 * (PR3.8 follow-up #2 — input contextualisé).
 *
 * Affiche un résumé du kit + 3 boutons :
 *   - "Ouvrir la trame" → slides plein écran (`IndividualCoachingSlides`)
 *   - "Copier"          → markdown dans le presse-papier
 *   - "Télécharger .md" → fichier markdown
 *
 * Pas d'intégration Gamma en V1 — fallback markdown obligatoire (cf. spec).
 */
export function IndividualCoachingPrep({
  advisor,
  expertiseId,
  metrics,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // PR-B — privilégie la source serveur (cerveau coach) puis bascule en
  // silence sur le fallback hardcoded. Ne bloque jamais l'UI : `pattern`
  // est synchroniquement le fallback au premier render.
  const {
    pattern: serverPattern,
    isLoading,
    source,
  } = useCoachingPattern(expertiseId);

  const kit = useMemo(
    () =>
      buildIndividualCoachingKit({
        advisor,
        expertiseId,
        metrics,
        patternOverride: serverPattern,
      }),
    [advisor, expertiseId, metrics, serverPattern],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serializeKitToMarkdown(kit));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // best-effort — fallback : bouton télécharger
    }
  };

  const handleDownload = () => {
    const md = serializeKitToMarkdown(kit);
    const slug = slugify(kit.title);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <>
      <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              Préparer mon coaching individuel
              {isLoading && source === "fallback" && (
                <Loader2
                  aria-label="Synchronisation des patterns coaching"
                  className="h-3.5 w-3.5 animate-spin text-muted-foreground"
                />
              )}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {kit.subtitle}
            </p>
          </div>
        </div>

        <ul className="mb-5 space-y-2 text-sm text-foreground">
          {kit.sections.map((s) => (
            <li key={s.heading} className="flex items-start gap-2">
              <span
                className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden
              />
              <span className="font-medium">{s.heading}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <FileText className="h-3.5 w-3.5" />
            Ouvrir la trame
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Copié
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copier
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" />
            Télécharger .md
          </button>
        </div>
      </div>

      <IndividualCoachingSlides
        open={open}
        onClose={() => setOpen(false)}
        kit={kit}
      />
    </>
  );
}

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "trame"
  );
}
