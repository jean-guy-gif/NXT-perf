"use client";

import { useMemo } from "react";
import { ArrowRight, Mail, Phone, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeakestAxis } from "@/lib/recruitment-coaching";
import type { DpiLead, DpiLeadStatus } from "@/types/dpi-lead";

const STATUS_CONFIG: Record<
  DpiLeadStatus,
  { label: string; className: string; rank: number }
> = {
  // rank : ordre de priorité d'affichage (haut = plus actionnable pour le directeur)
  pdf_downloaded: {
    label: "Téléchargé",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    rank: 1,
  },
  completed: {
    label: "Terminé",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    rank: 2,
  },
  restarted: {
    label: "Recommencé",
    className: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    rank: 3,
  },
  in_progress: {
    label: "En cours",
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    rank: 4,
  },
  opened: {
    label: "Ouvert",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    rank: 5,
  },
  sent: {
    label: "Envoyé",
    className: "bg-muted text-muted-foreground border-border",
    rank: 6,
  },
};

/** Statuts pour lesquels on affiche le bouton "Voir résultats". */
const ACTIONABLE_STATUSES: DpiLeadStatus[] = [
  "completed",
  "pdf_downloaded",
  "restarted",
];

interface DpiLeadsTableProps {
  leads: DpiLead[];
  onViewResults: (lead: DpiLead) => void;
}

export function DpiLeadsTable({ leads, onViewResults }: DpiLeadsTableProps) {
  // Tri : statut activé en premier (rank), puis date sentAt desc
  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      const rankDiff =
        STATUS_CONFIG[a.status].rank - STATUS_CONFIG[b.status].rank;
      if (rankDiff !== 0) return rankDiff;
      return b.sentAt.localeCompare(a.sentAt);
    });
  }, [leads]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-foreground">
            Aucun candidat n&apos;a encore reçu votre lien
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Partagez le lien ci-dessus à des conseillers que vous souhaitez recruter.
            Dès qu&apos;ils ouvriront le test, ils apparaîtront ici.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">
          Candidats — {sorted.length}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 font-medium">Candidat</th>
              <th className="px-4 py-2 font-medium">Reçu le</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 font-medium">Progression</th>
              <th className="px-4 py-2 font-medium">Score global</th>
              <th className="px-4 py-2 font-medium">Axe faible</th>
              <th className="px-4 py-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead) => {
              const cfg = STATUS_CONFIG[lead.status];
              const fullName =
                [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
              const isActionable = ACTIONABLE_STATUSES.includes(lead.status);
              const weakestAxis = lead.scores
                ? getWeakestAxis(lead.scores.axes)
                : null;
              const progressLabel =
                lead.status === "in_progress" && typeof lead.progressPct === "number"
                  ? `${lead.progressPct}%`
                  : lead.status === "sent"
                    ? "—"
                    : lead.progressPct === 100
                      ? "100%"
                      : lead.status === "opened"
                        ? "0%"
                        : "—";

              return (
                <tr
                  key={lead.id}
                  className="border-b border-border/50 transition-colors last:border-b-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{fullName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </span>
                      {lead.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(lead.sentAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                        cfg.className,
                      )}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-foreground">
                    {progressLabel}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {lead.scores ? (
                      <span className="font-bold text-foreground">
                        {lead.scores.globalScore}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {weakestAxis ? (
                      <span className="rounded-md bg-orange-500/10 px-2 py-0.5 font-medium text-orange-500">
                        {weakestAxis.label} ({weakestAxis.score})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isActionable && (
                      <button
                        type="button"
                        onClick={() => onViewResults(lead)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Voir résultats
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
