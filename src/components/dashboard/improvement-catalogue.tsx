"use client";

import { useState } from "react";
import {
  Target,
  ArrowRight,
  Users,
  CheckCircle2,
  Calendar as CalendarIcon,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import type { ImprovementResource } from "@/hooks/use-improvement-resources";
import { DEMO_COACH_CALENDAR_URL } from "@/config/coaching";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import { cn } from "@/lib/utils";

interface ImprovementCatalogueProps {
  /** Current ratio gap (0-100). Higher = bigger gap to objective */
  gap?: number;
  /** Ratio name for context */
  ratioName?: string;
  /** Ratio targeted for the plan. When provided with onTargetedPlanRequest,
   *  the Plan 30j card becomes a button that triggers targeted generation
   *  instead of the generic redirect. */
  ratioId?: ExpertiseRatioId;
  onTargetedPlanRequest?: (ratioId: ExpertiseRatioId) => void | Promise<void>;
}

function estimateROI(gap: number | undefined): {
  plan: string;
  coaching: string;
  training: string;
  formation: string;
} {
  const g = gap ?? 20;
  if (g < 10) return { plan: "+10%", coaching: "+20%", training: "+15%", formation: "+20%" };
  if (g < 30) return { plan: "+15%", coaching: "+25%", training: "+20%", formation: "+25%" };
  return { plan: "+20%", coaching: "+35%", training: "+25%", formation: "+30%" };
}

export function ImprovementCatalogue({
  gap,
  ratioName,
  ratioId,
  onTargetedPlanRequest,
}: ImprovementCatalogueProps) {
  const roi = estimateROI(gap);
  const context = ratioName ? ` sur ${ratioName}` : "";
  const isDemoMode = useAppStore((s) => s.isDemoMode);
  const { getNxtCoachingResource, updateResource, refresh } = useImprovementResources();
  const nxtCoaching = getNxtCoachingResource();

  const canTargetPlan = Boolean(ratioId && onTargetedPlanRequest);

  const staticTools: StaticToolProps[] = [
    {
      emoji: "📋",
      title: "Plan 30 jours",
      price: "GRATUIT",
      priceColor: "text-green-500",
      description: `Une feuille de route personnalisée${context}`,
      roi: `ROI estimé : ${roi.plan} sur votre taux en 30 jours`,
      cta: "Générer mon plan",
      href: "/formation?tab=plan30",
    },
    {
      emoji: "🏋️",
      title: "NXT Training",
      price: "2 sessions offertes",
      priceColor: "text-green-500",
      description: `Simulations et exercices pratiques${context}`,
      roi: `ROI estimé : ${roi.training} sur votre taux en 45 jours`,
      cta: "Commencer",
      href: "/formation?tab=entrainer",
    },
    {
      emoji: "📚",
      title: "Formation certifiante",
      price: "Prise en charge AGEFICE",
      priceColor: "text-amber-500",
      description: "Formation professionnelle certifiante",
      roi: `ROI estimé : ${roi.formation} sur votre taux durablement`,
      cta: "Voir le catalogue",
      href: "/formation?tab=financement",
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible">
      {/* Card 1 — Plan 30j (targeted button when ratioId provided, else static link) */}
      {canTargetPlan && ratioId && onTargetedPlanRequest ? (
        <TargetedPlanCard
          {...staticTools[0]}
          ratioId={ratioId}
          onClick={onTargetedPlanRequest}
        />
      ) : (
        <StaticToolCard {...staticTools[0]} />
      )}

      {/* Card 2 — NXT Coaching (dynamic based on resource status) */}
      <NxtCoachingCard
        context={context}
        roi={roi.coaching}
        nxtCoaching={nxtCoaching}
        isDemoMode={isDemoMode}
        updateResource={updateResource}
        refresh={refresh}
      />

      {/* Card 3 — NXT Training (static) */}
      <StaticToolCard {...staticTools[1]} />

      {/* Card 4 — Formation certifiante (static) */}
      <StaticToolCard {...staticTools[2]} />
    </div>
  );
}

// ─── Card générique pour outils statiques ──────────────────────────

type StaticToolProps = {
  emoji: string;
  title: string;
  price: string;
  priceColor: string;
  description: string;
  roi: string;
  cta: string;
  href: string;
};

function StaticToolCard(props: StaticToolProps) {
  return (
    <div className="relative rounded-xl border border-border bg-card p-5 space-y-2 w-72 flex-shrink-0 snap-start sm:w-auto sm:p-4">
      <div className="flex items-start gap-2 pr-[104px] sm:pr-0 sm:flex-col sm:items-stretch sm:gap-1">
        <span
          className={cn(
            "absolute top-3 right-3 z-10 rounded-md bg-card px-2 py-0.5 text-[11px] font-medium leading-tight text-right max-w-[96px] sm:static sm:self-start sm:max-w-full sm:text-[11px] sm:px-0 sm:py-0 sm:bg-transparent sm:text-left sm:order-1",
            props.priceColor
          )}
        >
          {props.price}
        </span>
        <div className="flex items-center gap-2 min-w-0 sm:order-2">
          <span className="text-lg">{props.emoji}</span>
          <h4 className="text-base font-semibold text-foreground sm:text-sm">{props.title}</h4>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{props.description}</p>
      <p className="text-xs text-primary/70 sm:text-[10px]">{props.roi}</p>
      <Link
        href={props.href}
        className="inline-flex items-center gap-1 min-h-[44px] py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors sm:min-h-0 sm:py-0 sm:text-xs"
      >
        {props.cta}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ─── Card Plan 30j ciblée (ratio connu) ───────────────────────────

function TargetedPlanCard({
  emoji,
  title,
  price,
  priceColor,
  description,
  roi,
  cta,
  ratioId,
  onClick,
}: StaticToolProps & {
  ratioId: ExpertiseRatioId;
  onClick: (ratioId: ExpertiseRatioId) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onClick(ratioId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative rounded-xl border border-border bg-card p-5 space-y-2 w-72 flex-shrink-0 snap-start sm:w-auto sm:p-4">
      <div className="flex items-start gap-2 pr-[104px] sm:pr-0 sm:flex-col sm:items-stretch sm:gap-1">
        <span
          className={cn(
            "absolute top-3 right-3 z-10 rounded-md bg-card px-2 py-0.5 text-[11px] font-medium leading-tight text-right max-w-[96px] sm:static sm:self-start sm:max-w-full sm:text-[11px] sm:px-0 sm:py-0 sm:bg-transparent sm:text-left sm:order-1",
            priceColor
          )}
        >
          {price}
        </span>
        <div className="flex items-center gap-2 min-w-0 sm:order-2">
          <span className="text-lg">{emoji}</span>
          <h4 className="text-base font-semibold text-foreground sm:text-sm">{title}</h4>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <p className="text-xs text-primary/70 sm:text-[10px]">{roi}</p>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center gap-1 min-h-[44px] py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 sm:py-0 sm:text-xs"
      >
        {busy ? "Génération…" : cta}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Card NXT Coaching dynamique ───────────────────────────────────

type NxtCoachingResource = ReturnType<
  ReturnType<typeof useImprovementResources>["getNxtCoachingResource"]
>;

function NxtCoachingCard({
  context,
  roi,
  nxtCoaching,
  isDemoMode,
  updateResource,
  refresh,
}: {
  context: string;
  roi: string;
  nxtCoaching: NxtCoachingResource;
  isDemoMode: boolean;
  updateResource: (id: string, patch: Partial<ImprovementResource>) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  if (nxtCoaching && nxtCoaching.status === "debrief_offered") {
    return (
      <DebriefOfferedCard
        nxtCoaching={nxtCoaching}
        isDemoMode={isDemoMode}
        updateResource={updateResource}
        refresh={refresh}
      />
    );
  }

  if (nxtCoaching?.status === "pending_human_coach") {
    return <PendingHumanCoachCard />;
  }

  if (nxtCoaching?.status === "human_coached") {
    return <HumanCoachedCard />;
  }

  if (nxtCoaching?.status === "subscribed") {
    return <SubscribedCard />;
  }

  // Default (none / no resource) — current presentation
  return (
    <StaticToolCard
      emoji="🎯"
      title="NXT Coaching"
      price="9€/mois"
      priceColor="text-foreground"
      description={`Coaching IA conversationnel adapté${context}`}
      roi={`ROI estimé : ${roi} sur votre taux en 60 jours`}
      cta="Essayer gratuitement"
      href="/souscrire"
    />
  );
}

// ─── État : debrief_offered ────────────────────────────────────────

function DebriefOfferedCard({
  nxtCoaching,
  isDemoMode,
  updateResource,
  refresh,
}: {
  nxtCoaching: NonNullable<NxtCoachingResource>;
  isDemoMode: boolean;
  updateResource: (id: string, patch: Partial<ImprovementResource>) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const [openedCalendar, setOpenedCalendar] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [localToast, setLocalToast] = useState<string | null>(null);

  const handleOpenCalendar = () => {
    if (typeof window !== "undefined") {
      window.open(DEMO_COACH_CALENDAR_URL, "_blank", "noopener,noreferrer");
    }
    setOpenedCalendar(true);
  };

  const handleConfirmAppointment = async () => {
    if (confirming) return;
    setConfirming(true);
    setLocalToast(null);
    try {
      const payload = nxtCoaching.payload as { source_plan_id?: string } | null;
      const sourcePlanId = payload?.source_plan_id;
      const now = new Date().toISOString();

      if (isDemoMode) {
        const existingPayload = (nxtCoaching.payload ?? {}) as Record<string, unknown>;
        await updateResource(nxtCoaching.id, {
          status: "pending_human_coach",
          payload: {
            ...existingPayload,
            human_coach_requested_at: now,
          },
        });
        setLocalToast("Coach assigné, votre plan va être suivi");
      } else {
        if (!sourcePlanId) {
          setLocalToast("Plan source introuvable");
          return;
        }
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setLocalToast("Tu sembles hors ligne. Vérifie ta connexion.");
          return;
        }
        const res = await fetch("/api/coaching/request-human-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: sourcePlanId }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          setLocalToast(
            body.message ?? `Erreur ${res.status} : demande coach impossible`
          );
          return;
        }
        setLocalToast("Coach assigné, votre plan va être suivi");
        await refresh();
      }
    } catch (err) {
      console.error("Erreur coaching request (catalogue):", err);
      setLocalToast(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Vérifie ta connexion et réessaie."
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="relative rounded-xl border-2 border-green-500/40 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-blue-500/10 p-5 space-y-3 w-72 flex-shrink-0 snap-start sm:w-auto sm:p-5 sm:col-span-2">
      <div className="flex items-start gap-2">
        <span className="text-2xl">🎁</span>
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-bold text-foreground">Debrief gratuit offert</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Votre plan 30j est terminé. NXT vous offre un debrief pour analyser vos
            résultats et préparer la suite.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          href="/coaching-debrief"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Debrief IA immédiat
        </Link>
        <button
          type="button"
          onClick={handleOpenCalendar}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          RDV avec coach NXT
        </button>
      </div>

      {openedCalendar && (
        <button
          type="button"
          onClick={handleConfirmAppointment}
          disabled={confirming}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {confirming ? "Confirmation…" : "J'ai pris RDV"}
        </button>
      )}

      {localToast && (
        <p className="text-xs text-muted-foreground italic">{localToast}</p>
      )}
    </div>
  );
}

// ─── Autres états ───────────────────────────────────────────────────

function PendingHumanCoachCard() {
  return (
    <div className="relative rounded-xl border-2 border-blue-500/40 bg-blue-500/5 p-5 space-y-2 w-72 flex-shrink-0 snap-start sm:w-auto sm:p-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-500" />
        <h4 className="text-sm font-bold text-foreground">Coaching humain programmé</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Votre RDV avec le coach NXT est en cours de validation.
      </p>
    </div>
  );
}

function HumanCoachedCard() {
  return (
    <div className="relative rounded-xl border-2 border-green-500/40 bg-green-500/5 p-5 space-y-2 w-72 flex-shrink-0 snap-start sm:w-auto sm:p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <h4 className="text-sm font-bold text-foreground">Coaching actif</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Vous êtes suivi par un coach NXT. Consultez vos sessions dans l&apos;espace coach.
      </p>
    </div>
  );
}

function SubscribedCard() {
  return (
    <div className="relative rounded-xl border-2 border-primary/40 bg-primary/5 p-5 space-y-2 w-72 flex-shrink-0 snap-start sm:w-auto sm:p-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h4 className="text-sm font-bold text-foreground">Abonné NXT Coaching</h4>
      </div>
      <p className="text-xs text-muted-foreground">Votre abonnement mensuel est actif.</p>
      <Link
        href="/parametres"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
      >
        Gérer mon abonnement
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

