"use client";

import { use, useState } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useCoachTargetData } from "@/hooks/use-coach-target-data";
import { TargetHeader } from "@/components/coach/target-header";
import { ScopeKpiGrid } from "@/components/coach/scope-kpi-grid";
import { CoachPanel } from "@/components/coach/coach-panel";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  STATUS_COLORS,
  STATUS_BG_COLORS,
  STATUS_BORDER_COLORS,
} from "@/lib/constants";
import { defaultRatioConfigs } from "@/data/mock-ratios";
import { computeAllRatios } from "@/lib/ratios";
import { generateDiagnostic, computeProgression, extractVolumes } from "@/lib/coach";
import type { ClientDiagnostic, ClientProgression, DiagnosticSeverity, ProgressionTrend } from "@/lib/coach";
import { cn } from "@/lib/utils";
import type { CoachTargetType } from "@/types/coach";
import type { RatioId, ComputedRatio } from "@/types/ratios";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Award,
  AlertTriangle,
  Users,
  ArrowRight,
  StickyNote,
  CalendarCheck,
  Plus,
  Trash2,
  Target,
  Save,
  Pencil,
  X,
} from "lucide-react";

/* ────── Helpers ────── */

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

function formatRatioValue(ratioId: string, value: number): string {
  const config = defaultRatioConfigs[ratioId as RatioId];
  if (!config) return String(value);
  if (config.isPercentage) return `${value}%`;
  return String(value);
}

function diagnosticColor(severity: DiagnosticSeverity): string {
  if (severity === "critical") return "text-red-500 bg-red-500/10 border-red-500/20";
  if (severity === "warning") return "text-orange-500 bg-orange-500/10 border-orange-500/20";
  return "text-green-500 bg-green-500/10 border-green-500/20";
}

function trendIcon(trend: ProgressionTrend) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function trendColor(trend: ProgressionTrend): string {
  if (trend === "up") return "text-green-500";
  if (trend === "down") return "text-red-500";
  return "text-muted-foreground";
}

/* ────── Status badge ────── */
function StatusBadge({ status }: { status: "ok" | "warning" | "danger" }) {
  const labels: Record<string, string> = { ok: "OK", warning: "Attention", danger: "Critique" };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium border",
        STATUS_COLORS[status], STATUS_BG_COLORS[status], STATUS_BORDER_COLORS[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

/* ────── Diagnostic Card ────── */
function DiagnosticCard({ diagnostic, progression }: { diagnostic: ClientDiagnostic; progression: ClientProgression }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className={cn("rounded-xl border p-4", diagnosticColor(diagnostic.severity))}>
        <p className="text-xs font-medium opacity-70 mb-1">Diagnostic principal</p>
        <p className="text-sm font-semibold">{diagnostic.label}</p>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-1">Progression</p>
        <div className="flex items-center gap-2">
          {trendIcon(progression.trend)}
          <span className={cn("text-sm font-semibold", trendColor(progression.trend))}>
            {progression.label}
          </span>
          {progression.deltaPct !== 0 && (
            <span className={cn("text-xs", trendColor(progression.trend))}>
              ({progression.deltaPct > 0 ? "+" : ""}{progression.deltaPct}% CA)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────── Volumes Grid ────── */
function VolumesGrid({ results }: { results: PeriodResults | undefined }) {
  if (!results) return null;
  const volumes = extractVolumes(results);
  if (!volumes) return null;

  const items = [
    { label: "Contacts", value: volumes.contacts },
    { label: "Estimations", value: volumes.estimations },
    { label: "Mandats", value: volumes.mandats },
    { label: "Visites", value: volumes.visites },
    { label: "Offres", value: volumes.offres },
    { label: "Compromis", value: volumes.compromis },
    { label: "Actes", value: volumes.actes },
    { label: "CA", value: volumes.ca.toLocaleString("fr-FR") + " €" },
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3">Volumes de performance</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-3 text-center">
            <p className="text-lg font-bold tabular-nums">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────── Ratio grid ────── */
function RatioGrid({ ratios }: { ratios: ComputedRatio[] }) {
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  if (ratios.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ratios.map((ratio) => {
        const config = ratioConfigs[ratio.ratioId as RatioId];
        return (
          <div key={ratio.ratioId} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{config?.name ?? ratio.ratioId}</p>
              <StatusBadge status={ratio.status} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-lg font-bold tabular-nums", STATUS_COLORS[ratio.status])}>
                {formatRatioValue(ratio.ratioId, ratio.value)}
              </span>
              <span className="text-xs text-muted-foreground">
                / {formatRatioValue(ratio.ratioId, ratio.thresholdForCategory)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  ratio.status === "ok" ? "bg-green-500" : ratio.status === "warning" ? "bg-orange-500" : "bg-red-500"
                )}
                style={{ width: `${Math.min(100, Math.max(0, ratio.percentageOfTarget))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────── Private Notes Editor ────── */
function NotesEditor({ assignmentId }: { assignmentId: string }) {
  const coachNotes = useAppStore((s) => s.coachNotes);
  const upsertCoachNote = useAppStore((s) => s.upsertCoachNote);
  const existing = coachNotes.find((n) => n.coachAssignmentId === assignmentId);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(existing?.content ?? "");

  const handleSave = () => {
    upsertCoachNote(assignmentId, content);
    setEditing(false);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Notes privées</h3>
        </div>
        {!editing && (
          <button
            onClick={() => { setContent(existing?.content ?? ""); setEditing(true); }}
            className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Modifier
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Vos observations privées sur ce client…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px] resize-y"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Save className="h-3 w-3" />
              Enregistrer
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : existing?.content ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{existing.content}</p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Aucune note. Cliquez sur Modifier pour ajouter vos observations.</p>
      )}

      {existing?.updatedAt && !editing && (
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          Mis à jour le {new Date(existing.updatedAt).toLocaleDateString("fr-FR")}
        </p>
      )}
    </div>
  );
}

/* ────── Session History ────── */
function SessionHistory({ assignmentId }: { assignmentId: string }) {
  const coachSessions = useAppStore((s) => s.coachSessions);
  const addCoachSession = useAppStore((s) => s.addCoachSession);
  const removeCoachSession = useAppStore((s) => s.removeCoachSession);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const sessions = coachSessions
    .filter((s) => s.coachAssignmentId === assignmentId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addCoachSession({
      id: "csess-" + Date.now(),
      coachAssignmentId: assignmentId,
      date,
      title: title.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    });
    setTitle("");
    setNotes("");
    setShowForm(false);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Sessions de coaching</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {sessions.length}
          </span>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-3 w-3" />
            Ajouter
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-2 rounded-lg border bg-muted/50 p-3 mb-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sujet de la session…"
              className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes de la session (optionnel)…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[60px] resize-y"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {sessions.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground italic">Aucune session enregistrée</p>
      )}

      <div className="space-y-2">
        {sessions.map((session) => (
          <div key={session.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(session.date).toLocaleDateString("fr-FR")}
                </span>
                <span className="text-sm font-medium">{session.title}</span>
              </div>
              {session.notes && (
                <p className="text-xs text-muted-foreground">{session.notes}</p>
              )}
            </div>
            <button
              onClick={() => removeCoachSession(session.id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────── Quick Plan Editor ────── */
function QuickPlanEditor({ assignmentId }: { assignmentId: string }) {
  const coachQuickPlans = useAppStore((s) => s.coachQuickPlans);
  const upsertCoachQuickPlan = useAppStore((s) => s.upsertCoachQuickPlan);
  const existing = coachQuickPlans.find((p) => p.coachAssignmentId === assignmentId);

  const [editing, setEditing] = useState(false);
  const [objective, setObjective] = useState(existing?.objective ?? "");
  const [actions, setActions] = useState<string[]>(existing?.actions ?? [""]);
  const [comment, setComment] = useState(existing?.comment ?? "");

  const handleSave = () => {
    const filteredActions = actions.filter((a) => a.trim() !== "");
    if (!objective.trim() && filteredActions.length === 0) return;
    upsertCoachQuickPlan(assignmentId, {
      objective: objective.trim(),
      actions: filteredActions,
      comment: comment.trim(),
    });
    setEditing(false);
  };

  const handleAddAction = () => setActions([...actions, ""]);

  const handleRemoveAction = (idx: number) => {
    setActions(actions.filter((_, i) => i !== idx));
  };

  const handleActionChange = (idx: number, value: string) => {
    setActions(actions.map((a, i) => (i === idx ? value : a)));
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Plan d'action</h3>
        </div>
        {!editing && (
          <button
            onClick={() => {
              setObjective(existing?.objective ?? "");
              setActions(existing?.actions?.length ? [...existing.actions] : [""]);
              setComment(existing?.comment ?? "");
              setEditing(true);
            }}
            className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="h-3 w-3" />
            {existing ? "Modifier" : "Créer"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Objectif court terme</label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ex : Atteindre 5 RDV estimation par semaine"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Actions prioritaires</label>
            <div className="space-y-1.5">
              {actions.map((action, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={action}
                    onChange={(e) => handleActionChange(idx, e.target.value)}
                    placeholder={`Action ${idx + 1}…`}
                    className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {actions.length > 1 && (
                    <button
                      onClick={() => handleRemoveAction(idx)}
                      className="shrink-0 rounded-md p-1 text-muted-foreground/50 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleAddAction}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3 w-3" />
                Ajouter une action
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Commentaire coach</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Contexte, observations…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[60px] resize-y"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Save className="h-3 w-3" />
              Enregistrer
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : existing ? (
        <div className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Objectif</p>
            <p className="text-sm font-medium">{existing.objective}</p>
          </div>
          {existing.actions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Actions</p>
              <ul className="space-y-1">
                {existing.actions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {existing.comment && (
            <div>
              <p className="text-xs text-muted-foreground">Commentaire</p>
              <p className="text-sm text-muted-foreground">{existing.comment}</p>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/60">
            Mis à jour le {new Date(existing.updatedAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Aucun plan d'action défini</p>
      )}
    </div>
  );
}

/* ────── Clickable person row ────── */
function PersonRow({
  user,
  href,
  score,
  alerts,
  extra,
}: {
  user: User;
  href: string;
  score: number;
  alerts: number;
  extra?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
        {extra}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span className={cn("text-sm font-semibold tabular-nums", scoreColor(score))}>{score}%</span>
        {alerts > 0 && (
          <span className="flex items-center gap-1 text-xs text-orange-500">
            <AlertTriangle className="h-3 w-3" />
            {alerts}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ────── Coach Tools Section (notes + sessions + plan d'action) ────── */
function CoachTools({ assignmentId }: { assignmentId: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Outils du coach</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QuickPlanEditor assignmentId={assignmentId} />
        <NotesEditor assignmentId={assignmentId} />
      </div>
      <SessionHistory assignmentId={assignmentId} />
    </div>
  );
}

/* ────── INSTITUTION View ────── */
function InstitutionView({
  data,
  targetId,
}: {
  data: ReturnType<typeof useCoachTargetData>;
  targetId: string;
}) {
  const { agencyKpis, managersAggregate, advisorsAggregate, assignment, weakKpis } = data;
  const allResults = useAppStore((s) => s.results);
  const users = useAppStore((s) => s.users);

  // Compute aggregate volumes
  const orgUsers = users.filter((u) => u.institutionId === targetId);
  let totalContacts = 0, totalEstimations = 0, totalMandats = 0;
  let totalVisites = 0, totalOffres = 0, totalCompromis = 0;
  for (const u of orgUsers) {
    const r = allResults.find((res) => res.userId === u.id && res.periodStart >= "2026-02-01");
    if (r) {
      totalContacts += r.prospection.contactsTotaux;
      totalEstimations += r.vendeurs.estimationsRealisees;
      totalMandats += r.vendeurs.mandatsSignes;
      totalVisites += r.acheteurs.nombreVisites;
      totalOffres += r.acheteurs.offresRecues;
      totalCompromis += r.acheteurs.compromisSignes;
    }
  }

  const kpis = agencyKpis
    ? [
        { label: "CA total", value: agencyKpis.totalCA.toLocaleString("fr-FR") + " €", icon: TrendingUp },
        { label: "Actes total", value: String(agencyKpis.totalActes), icon: FileText },
        { label: "Score moyen", value: agencyKpis.avgScore + "%", icon: Award },
        { label: "Alertes", value: String(agencyKpis.alertCount), icon: AlertTriangle },
      ]
    : [];

  return (
    <div className="space-y-6">
      <TargetHeader targetType="INSTITUTION" targetName="Organisation" />

      {kpis.length > 0 && <ScopeKpiGrid kpis={kpis} />}

      {/* Volumes */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Volumes de performance</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: "Contacts", value: totalContacts },
            { label: "Estimations", value: totalEstimations },
            { label: "Mandats", value: totalMandats },
            { label: "Visites", value: totalVisites },
            { label: "Offres", value: totalOffres },
            { label: "Compromis", value: totalCompromis },
          ].map((v) => (
            <div key={v.label} className="rounded-xl border bg-card p-3 text-center">
              <p className="text-lg font-bold tabular-nums">{v.value}</p>
              <p className="text-xs text-muted-foreground">{v.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Managers table */}
      {managersAggregate && managersAggregate.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Managers</h2>
          <div className="rounded-xl border overflow-hidden divide-y">
            <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
              <span>Nom</span>
              <span className="text-center">Équipe</span>
              <span className="text-center">Score</span>
              <span className="text-center">Alertes</span>
            </div>
            {managersAggregate.map((mgr) => (
              <Link
                key={mgr.user.id}
                href={`/coach/targets/MANAGER/${mgr.user.id}`}
                className="grid grid-cols-4 gap-2 px-4 py-3 hover:bg-muted/50 transition-colors items-center"
              >
                <span className="text-sm font-medium truncate">{mgr.user.firstName} {mgr.user.lastName}</span>
                <span className="text-sm text-center tabular-nums">{mgr.teamSize}</span>
                <span className={cn("text-sm font-semibold text-center tabular-nums", scoreColor(mgr.avgScore))}>{mgr.avgScore}%</span>
                <span className="text-sm text-center tabular-nums">{mgr.alertCount}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Advisors table */}
      {advisorsAggregate && advisorsAggregate.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Conseillers</h2>
          <div className="rounded-xl border overflow-hidden divide-y">
            <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
              <span>Nom</span>
              <span className="text-center">Catégorie</span>
              <span className="text-center">Score</span>
              <span className="text-center">Alertes</span>
            </div>
            {advisorsAggregate.map((adv) => (
              <Link
                key={adv.user.id}
                href={`/coach/targets/AGENT/${adv.user.id}`}
                className="grid grid-cols-4 gap-2 px-4 py-3 hover:bg-muted/50 transition-colors items-center"
              >
                <span className="text-sm font-medium truncate">{adv.user.firstName} {adv.user.lastName}</span>
                <span className="text-center">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", CATEGORY_COLORS[adv.user.category] ?? "")}>
                    {CATEGORY_LABELS[adv.user.category] ?? adv.user.category}
                  </span>
                </span>
                <span className={cn("text-sm font-semibold text-center tabular-nums", scoreColor(adv.avgScore))}>{adv.avgScore}%</span>
                <span className="text-sm text-center tabular-nums">{adv.alertCount}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Plan 30j link */}
      <Link
        href={`/coach/targets/INSTITUTION/${targetId}/plan`}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Plan 30 jours
        <ArrowRight className="h-4 w-4" />
      </Link>

      {/* Coach tools */}
      {assignment && <CoachTools assignmentId={assignment.id} />}

      {/* CoachPanel (actions + plan 30j preview) */}
      {assignment && (
        <div className="rounded-xl border bg-card p-5">
          <CoachPanel assignmentId={assignment.id} userId={targetId} ratios={weakKpis} />
        </div>
      )}
    </div>
  );
}

/* ────── MANAGER View ────── */
function ManagerView({
  data,
  targetId,
}: {
  data: ReturnType<typeof useCoachTargetData>;
  targetId: string;
}) {
  const { managerUser, managerRatios, teamAdvisors, assignment } = data;
  const allResults = useAppStore((s) => s.results);

  if (!managerUser) return null;

  // Manager results
  const mgrResults = allResults.find((r) => r.userId === targetId && r.periodStart >= "2026-02-01");
  const mgrPrevResults = allResults.find((r) => r.userId === targetId && r.periodStart < "2026-02-01");

  const avgScoreVal = managerRatios && managerRatios.length > 0
    ? Math.round(managerRatios.reduce((s, r) => s + (r.percentageOfTarget ?? 0), 0) / managerRatios.length)
    : 0;

  const diagnostic = generateDiagnostic(managerRatios ?? [], mgrResults);
  const progression = computeProgression(mgrResults, mgrPrevResults, avgScoreVal, 0);

  const teamSize = teamAdvisors?.length ?? 0;
  const alertsVal = managerRatios ? managerRatios.filter((r) => r.status === "danger" || r.status === "warning").length : 0;

  const kpis = [
    { label: "Score moyen", value: avgScoreVal + "%", icon: Award },
    { label: "Alertes", value: String(alertsVal), icon: AlertTriangle },
    { label: "Taille équipe", value: String(teamSize), icon: Users },
    { label: "En alerte", value: String(teamAdvisors?.filter((a) => a.alertCount > 0).length ?? 0), icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <TargetHeader
        targetType="MANAGER"
        targetName={managerUser.firstName + " " + managerUser.lastName}
      />

      <ScopeKpiGrid kpis={kpis} />
      <DiagnosticCard diagnostic={diagnostic} progression={progression} />

      {/* Volumes */}
      <VolumesGrid results={mgrResults} />

      {/* Manager ratios */}
      {managerRatios && managerRatios.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Ratios de performance</h2>
          <RatioGrid ratios={managerRatios} />
        </div>
      )}

      {/* Team advisors */}
      {teamAdvisors && teamAdvisors.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Équipe</h2>
          <div className="rounded-xl border overflow-hidden divide-y">
            {teamAdvisors.map((adv) => (
              <PersonRow
                key={adv.user.id}
                user={adv.user}
                href={`/coach/targets/AGENT/${adv.user.id}`}
                score={adv.avgScore}
                alerts={adv.alertCount}
                extra={
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0", CATEGORY_COLORS[adv.user.category] ?? "")}>
                    {CATEGORY_LABELS[adv.user.category] ?? adv.user.category}
                  </span>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Plan link */}
      <Link
        href={`/coach/targets/MANAGER/${targetId}/plan`}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Plan 30 jours
        <ArrowRight className="h-4 w-4" />
      </Link>

      {/* Coach tools */}
      {assignment && <CoachTools assignmentId={assignment.id} />}

      {/* CoachPanel */}
      {assignment && (
        <div className="rounded-xl border bg-card p-5">
          <CoachPanel assignmentId={assignment.id} userId={managerUser.id} ratios={managerRatios ?? []} />
        </div>
      )}
    </div>
  );
}

/* ────── AGENT View ────── */
function AgentView({
  data,
  targetId,
}: {
  data: ReturnType<typeof useCoachTargetData>;
  targetId: string;
}) {
  const { advisorUser, advisorRatios, assignment } = data;
  const allResults = useAppStore((s) => s.results);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  if (!advisorUser) return null;

  // Current and previous results
  const userResults = allResults
    .filter((r) => r.userId === targetId)
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  const currentResults = userResults[0];
  const previousResults = userResults[1];

  const prevRatios = previousResults
    ? computeAllRatios(previousResults, advisorUser.category, ratioConfigs)
    : [];

  const avgScoreVal = advisorRatios && advisorRatios.length > 0
    ? Math.round(advisorRatios.reduce((s, r) => s + (r.percentageOfTarget ?? 0), 0) / advisorRatios.length)
    : 0;
  const prevScore = prevRatios.length > 0
    ? Math.round(prevRatios.reduce((s, r) => s + (r.percentageOfTarget ?? 0), 0) / prevRatios.length)
    : 0;

  const diagnostic = generateDiagnostic(advisorRatios ?? [], currentResults);
  const progression = computeProgression(currentResults, previousResults, avgScoreVal, prevScore);

  // Extract KPIs from results
  const ca = currentResults?.ventes.chiffreAffaires != null
    ? currentResults.ventes.chiffreAffaires.toLocaleString("fr-FR") + " €" : "—";
  const actes = currentResults?.ventes.actesSignes != null ? String(currentResults.ventes.actesSignes) : "—";
  const mandats = currentResults?.vendeurs.mandatsSignes != null ? String(currentResults.vendeurs.mandatsSignes) : "—";
  const exclusiviteRatio = advisorRatios?.find((r) => r.ratioId === "pct_mandats_exclusifs");
  const exclusivite = exclusiviteRatio != null ? `${exclusiviteRatio.value}%` : "—";

  const kpis = [
    { label: "Chiffre d'Affaires", value: ca, icon: TrendingUp },
    { label: "Actes signés", value: actes, icon: FileText },
    { label: "Mandats signés", value: mandats, icon: Award },
    { label: "% Exclusivité", value: exclusivite, icon: Award },
  ];

  return (
    <div className="space-y-6">
      <TargetHeader
        targetType="AGENT"
        targetName={advisorUser.firstName + " " + advisorUser.lastName}
      />

      <ScopeKpiGrid kpis={kpis} />
      <DiagnosticCard diagnostic={diagnostic} progression={progression} />

      {/* Volumes */}
      <VolumesGrid results={currentResults} />

      {/* Full ratio grid */}
      {advisorRatios && advisorRatios.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Ratios de performance</h2>
          <RatioGrid ratios={advisorRatios} />
        </div>
      )}

      {/* Plan link */}
      <Link
        href={`/coach/targets/AGENT/${targetId}/plan`}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Plan 30 jours
        <ArrowRight className="h-4 w-4" />
      </Link>

      {/* Coach tools */}
      {assignment && <CoachTools assignmentId={assignment.id} />}

      {/* CoachPanel */}
      {assignment && (
        <div className="rounded-xl border bg-card p-5">
          <CoachPanel assignmentId={assignment.id} userId={advisorUser.id} ratios={advisorRatios ?? []} />
        </div>
      )}
    </div>
  );
}

/* ────── Main Page ────── */
const VALID_TYPES: CoachTargetType[] = ["AGENT", "MANAGER", "INSTITUTION"];

export default function TargetScopeViewPage({
  params,
}: {
  params: Promise<{ targetType: string; targetId: string }>;
}) {
  const { targetType, targetId } = use(params);

  if (!VALID_TYPES.includes(targetType as CoachTargetType)) {
    redirect("/coach/dashboard");
  }

  const validType = targetType as CoachTargetType;
  const data = useCoachTargetData(validType, targetId);

  if (!data.assignment) {
    redirect("/coach/dashboard");
  }

  return (
    <div className="space-y-6">
      {validType === "INSTITUTION" && <InstitutionView data={data} targetId={targetId} />}
      {validType === "MANAGER" && <ManagerView data={data} targetId={targetId} />}
      {validType === "AGENT" && <AgentView data={data} targetId={targetId} />}
    </div>
  );
}
