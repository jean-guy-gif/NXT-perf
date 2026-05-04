"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Mail,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import {
  getCommonCauses,
  getTopPractices,
  type CoachingPattern,
} from "@/lib/coaching/coach-brain";
import {
  buildCoachingDecisionSummary,
  DECISION_LABEL,
  emptySession,
  TAG_LABEL,
  type CoachingSession,
  type CoachingTag,
  type ManagerDecision,
} from "@/lib/coaching/coaching-decision-summary";
import {
  buildEmailRecap,
  buildWhatsappRecap,
} from "@/lib/coaching/coaching-recap-formats";
import type { CoachingMetrics } from "@/lib/coaching/individual-coaching-kit";
import type { AdvisorDiagnosis } from "@/lib/coaching/advisor-diagnosis";

interface Props {
  open: boolean;
  onClose: () => void;
  advisor: { firstName: string; lastName?: string; level?: string };
  expertiseId: ExpertiseRatioId | null;
  metrics?: CoachingMetrics;
  /** Pattern coaching à utiliser pour les options causes/actions. */
  pattern: CoachingPattern | null;
  /** Diagnostic chiffres réels — enrichit les formats Email / WhatsApp. */
  diagnosis?: AdvisorDiagnosis | null;
}

type RecapFormat = "markdown" | "email" | "whatsapp";

const FORMAT_LABEL: Record<RecapFormat, string> = {
  markdown: "Récap structuré",
  email: "Email pro",
  whatsapp: "WhatsApp",
};

type SectionKey = keyof CoachingSession["answers"];

const TAG_KEYS: NonNullable<CoachingTag>[] = [
  "blocage",
  "engagement",
  "resistance",
  "creuser",
];

const DECISION_STYLE: Record<ManagerDecision, { ring: string; pill: string }> = {
  autonomie_surveillee: {
    ring: "border-emerald-500/30 bg-emerald-500/5",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
  },
  point_hebdo: {
    ring: "border-orange-500/30 bg-orange-500/5",
    pill: "bg-orange-500/10 text-orange-600 dark:text-orange-500",
  },
  accompagnement_renforce: {
    ring: "border-red-500/30 bg-red-500/5",
    pill: "bg-red-500/10 text-red-600 dark:text-red-500",
  },
};

/**
 * IndividualCoachingLive — panneau de coaching interactif (PR3.8 follow-up).
 *
 * Mode "live" qui transforme la trame en outil de décision :
 *   - 5 sections avec saisie de réponse + tag rapide optionnel
 *   - Section Prise de conscience : choix d'UNE cause principale (3 options
 *     issues du pattern serveur/fallback + champ libre "Autre")
 *   - Section Travail levier : choix d'UNE action prioritaire (single choice
 *     forcé — pas de multi-sélection)
 *   - Section Engagement : 3 champs chiffrés (volume / échéance / créneau)
 *   - Synthèse mise à jour en temps réel avec niveau de suivi recommandé
 *     dérivé des règles de `coaching-decision-summary`
 *
 * Aucune mutation côté plan conseiller. Aucune persistance — état local
 * réinitialisé à la fermeture du panneau (export markdown uniquement).
 */
export function IndividualCoachingLive({
  open,
  onClose,
  advisor,
  expertiseId,
  metrics,
  pattern,
  diagnosis,
}: Props) {
  const [formatTab, setFormatTab] = useState<RecapFormat>("markdown");
  const [session, setSession] = useState<CoachingSession>(() =>
    emptySession({ advisor, expertiseId, metrics }),
  );
  const [copied, setCopied] = useState(false);

  // Reset session quand on ré-ouvre le panneau ou que le conseiller change.
  useEffect(() => {
    if (!open) return;
    setSession(emptySession({ advisor, expertiseId, metrics }));
    setCopied(false);
  }, [open, advisor, expertiseId, metrics]);

  // Body scroll lock + Escape
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Sources : pattern serveur > fallback coach-brain
  const causeOptions = useMemo<string[]>(() => {
    if (pattern && pattern.recurringMistakes.length > 0) {
      return pattern.recurringMistakes.slice(0, 3);
    }
    if (expertiseId) return getCommonCauses(expertiseId, 3);
    return [];
  }, [pattern, expertiseId]);

  const actionOptions = useMemo<string[]>(() => {
    if (pattern && pattern.coachingAngles.length > 0) {
      return pattern.coachingAngles.slice(0, 3);
    }
    if (expertiseId) return getTopPractices(expertiseId, 3);
    return [];
  }, [pattern, expertiseId]);

  const expertise = expertiseId ? RATIO_EXPERTISE[expertiseId] : null;
  const leverLabel = expertise?.label ?? null;
  const leverInline = leverLabel ? `« ${leverLabel} »` : "ce levier";

  // Synthèse live (recalculée à chaque keystroke — c'est OK, fonctions pures).
  const summary = useMemo(
    () => buildCoachingDecisionSummary(session),
    [session],
  );

  // ─── Updaters ─────────────────────────────────────────────────────────

  const setAnswer = (section: SectionKey, value: Partial<{ text: string; tag: CoachingTag }>) =>
    setSession((s) => ({
      ...s,
      answers: { ...s.answers, [section]: { ...s.answers[section], ...value } },
    }));

  // ─── Récap par format (Markdown / Email pro / WhatsApp) ──────────────

  const recapText = useMemo(() => {
    if (formatTab === "email") {
      return buildEmailRecap({ session, diagnosis: diagnosis ?? null });
    }
    if (formatTab === "whatsapp") {
      return buildWhatsappRecap({ session, diagnosis: diagnosis ?? null });
    }
    return summary.markdown;
  }, [formatTab, session, diagnosis, summary]);

  // ─── Handlers export ──────────────────────────────────────────────────

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recapText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // best-effort
    }
  };

  const handleDownload = () => {
    const slug = `synthese-coaching-${slugify(advisor.firstName)}-${formatTab}`;
    const ext = formatTab === "markdown" ? "md" : "txt";
    const mime =
      formatTab === "markdown"
        ? "text/markdown;charset=utf-8"
        : "text/plain;charset=utf-8";
    const blob = new Blob([recapText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  // ─── Envoi direct (V1, sans backend) ─────────────────────────────────

  const advisorFullName = `${advisor.firstName}${advisor.lastName ? " " + advisor.lastName : ""}`;

  const handleSendEmail = () => {
    const body = buildEmailRecap({ session, diagnosis: diagnosis ?? null });
    const subject = `Récap coaching — ${advisorFullName}`;
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Note : on n'a pas l'email du conseiller dans le prop `advisor` côté
    // V1, donc le destinataire reste vide — le manager le saisit dans son
    // client mail. Aucune dépendance / API serveur ajoutée.
    window.location.href = mailto;
  };

  const handleSendWhatsapp = () => {
    const message = buildWhatsappRecap({ session, diagnosis: diagnosis ?? null });
    // Pas de numéro disponible côté `advisor` en V1 → fallback `wa.me`
    // sans numéro, ce qui ouvre WhatsApp Web et laisse le manager choisir
    // le contact dans sa liste.
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!open) return null;

  const fullName = `${advisor.firstName}${advisor.lastName ? " " + advisor.lastName : ""}`;
  const decisionStyle = DECISION_STYLE[summary.decision];

  // ─── Questions principales par section ─────────────────────────────────
  const ouvertureQuestion = metrics
    ? `Tu es à ${metrics.donePct} % d'avancement à J+${metrics.dayOfPlan}/${metrics.totalDays}, avec ${metrics.doneActions} actions cochées sur ${metrics.totalActions}. Qu'est-ce qui explique cet écart selon toi ?`
    : `Sur quoi veux-tu progresser en priorité ce mois-ci, ${advisor.firstName} ?`;

  const priseDeConscienceQuestion =
    pattern?.signalQuestions?.[0] ??
    `Sur ${leverInline}, à quel moment précis ça bloque dans ta démarche ?`;

  const travailLevierQuestion = `Laquelle de ces pratiques te semble la plus actionnable cette semaine ?`;
  const engagementQuestion = `Quelle action concrète t'engages-tu à réaliser avant le prochain point ?`;
  const decisionManagerQuestion = `Note manager — observations à reporter (optionnel).`;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Coaching individuel — ${fullName}`}
        className="fixed inset-0 z-50 flex flex-col bg-background sm:inset-4 sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 sm:px-8 sm:py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-foreground sm:text-lg">
              Coaching individuel — {fullName}
            </h2>
            {leverLabel && (
              <p className="text-xs text-muted-foreground">
                Levier : <span className="font-medium text-foreground">{leverLabel}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-3xl space-y-5">
            {/* Section A. Ouverture */}
            <SectionCard
              letter="A"
              title="Ouverture"
              question={ouvertureQuestion}
            >
              <AnswerArea
                value={session.answers.ouverture.text}
                onChange={(text) => setAnswer("ouverture", { text })}
              />
              <TagRow
                value={session.answers.ouverture.tag}
                onChange={(tag) => setAnswer("ouverture", { tag })}
              />
            </SectionCard>

            {/* Section B. Prise de conscience */}
            <SectionCard
              letter="B"
              title="Prise de conscience"
              question={priseDeConscienceQuestion}
            >
              <AnswerArea
                value={session.answers.priseDeConscience.text}
                onChange={(text) => setAnswer("priseDeConscience", { text })}
              />
              <TagRow
                value={session.answers.priseDeConscience.tag}
                onChange={(tag) => setAnswer("priseDeConscience", { tag })}
              />

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cause principale (1 seule)
                </p>
                {causeOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Pas d&apos;options pré-suggérées pour ce levier — utiliser
                    le champ libre.
                  </p>
                )}
                {causeOptions.map((opt) => (
                  <RadioRow
                    key={opt}
                    name="cause"
                    value={opt}
                    checked={session.selectedCause === opt}
                    onChange={() =>
                      setSession((s) => ({ ...s, selectedCause: opt }))
                    }
                    label={opt}
                  />
                ))}
                <RadioRow
                  name="cause"
                  value="custom"
                  checked={session.selectedCause === "custom"}
                  onChange={() =>
                    setSession((s) => ({ ...s, selectedCause: "custom" }))
                  }
                  label="Autre"
                />
                {session.selectedCause === "custom" && (
                  <input
                    type="text"
                    value={session.selectedCauseCustom}
                    onChange={(e) =>
                      setSession((s) => ({
                        ...s,
                        selectedCauseCustom: e.target.value,
                      }))
                    }
                    placeholder="Préciser la cause…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            </SectionCard>

            {/* Section C. Travail sur le levier */}
            <SectionCard
              letter="C"
              title="Travail sur le levier"
              question={travailLevierQuestion}
            >
              <AnswerArea
                value={session.answers.travailLevier.text}
                onChange={(text) => setAnswer("travailLevier", { text })}
              />
              <TagRow
                value={session.answers.travailLevier.tag}
                onChange={(tag) => setAnswer("travailLevier", { tag })}
              />

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Action prioritaire (1 seule)
                </p>
                {actionOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Pas d&apos;options pré-suggérées pour ce levier.
                  </p>
                )}
                {actionOptions.map((opt) => (
                  <RadioRow
                    key={opt}
                    name="action"
                    value={opt}
                    checked={session.selectedAction === opt}
                    onChange={() =>
                      setSession((s) => ({ ...s, selectedAction: opt }))
                    }
                    label={opt}
                  />
                ))}
              </div>
            </SectionCard>

            {/* Section D. Engagement */}
            <SectionCard
              letter="D"
              title="Engagement"
              question={engagementQuestion}
            >
              <AnswerArea
                value={session.answers.engagement.text}
                onChange={(text) => setAnswer("engagement", { text })}
              />
              <TagRow
                value={session.answers.engagement.tag}
                onChange={(tag) => setAnswer("engagement", { tag })}
              />

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <LabeledInput
                  label="Volume prévu"
                  placeholder="ex : 20 appels"
                  value={session.commitmentVolume}
                  onChange={(v) =>
                    setSession((s) => ({ ...s, commitmentVolume: v }))
                  }
                />
                <LabeledInput
                  label="Échéance"
                  placeholder="ex : vendredi 12h"
                  value={session.commitmentDeadline}
                  onChange={(v) =>
                    setSession((s) => ({ ...s, commitmentDeadline: v }))
                  }
                />
                <LabeledInput
                  label="Créneau / fréquence"
                  placeholder="ex : 9h-10h chaque jour"
                  value={session.commitmentSchedule}
                  onChange={(v) =>
                    setSession((s) => ({ ...s, commitmentSchedule: v }))
                  }
                />
              </div>
            </SectionCard>

            {/* Section E. Décision manager */}
            <SectionCard
              letter="E"
              title="Décision manager"
              question={decisionManagerQuestion}
            >
              <AnswerArea
                value={session.answers.decisionManager.text}
                onChange={(text) => setAnswer("decisionManager", { text })}
              />
              <TagRow
                value={session.answers.decisionManager.tag}
                onChange={(tag) => setAnswer("decisionManager", { tag })}
              />
            </SectionCard>

            {/* Synthèse live */}
            <div className={cn("rounded-xl border p-5", decisionStyle.ring)}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                    Synthèse du coaching
                  </h3>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    decisionStyle.pill,
                  )}
                >
                  {DECISION_LABEL[summary.decision]}
                </span>
              </div>

              {/* Onglets format de récap */}
              <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                {(["markdown", "email", "whatsapp"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormatTab(f)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      formatTab === f
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {FORMAT_LABEL[f]}
                  </button>
                ))}
              </div>

              <pre className="max-h-[24rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-xs leading-relaxed text-foreground">
                {recapText}
              </pre>

              <div className="mt-4 flex flex-wrap items-center gap-2">
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

                {/* Envoi direct — visible uniquement dans l'onglet correspondant */}
                {formatTab === "email" && (
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Envoyer par email
                  </button>
                )}
                {formatTab === "whatsapp" && (
                  <button
                    type="button"
                    onClick={handleSendWhatsapp}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Envoyer par WhatsApp
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  aria-label={`Télécharger en ${FORMAT_LABEL[formatTab]}`}
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger .md
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function SectionCard({
  letter,
  title,
  question,
  children,
}: {
  letter: string;
  title: string;
  question: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-3 flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
          aria-hidden
        >
          {letter}
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
      </header>
      <p className="mb-3 text-sm font-medium leading-relaxed text-foreground">
        {question}
      </p>
      {children}
    </section>
  );
}

function AnswerArea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Réponse du conseiller…"
      rows={3}
      className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function TagRow({
  value,
  onChange,
}: {
  value: CoachingTag;
  onChange: (t: CoachingTag) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {TAG_KEYS.map((tag) => {
        const active = value === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(active ? null : tag)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {TAG_LABEL[tag]}
          </button>
        );
      })}
    </div>
  );
}

function RadioRow({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors",
        checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <span className="text-foreground">{label}</span>
    </label>
  );
}

function LabeledInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
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
      .slice(0, 60) || "session"
  );
}
