"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { useAppStore } from "@/stores/app-store";
import { formatCurrency } from "@/lib/formatters";
import { ProgressBar } from "@/components/charts/progress-bar";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { useTeamManagement } from "@/hooks/use-team-management";
import type { RatioConfig, RatioId, ComputedRatio } from "@/types/ratios";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { DbProfile } from "@/types/database";
import {
  Users as UsersIcon,
  UserPlus,
  Trash2,
  Copy,
  Check,
  Mail,
  MessageCircle,
  Building2,
  Pencil,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { buildInviteLink, buildMailtoUrl, buildWhatsappUrl, buildInviteMessage } from "@/lib/invite";

type ViewMode = "individual" | "collective";

export default function EquipePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("collective");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const removeUser = useAppStore((s) => s.removeUser);
  const allResults = useAllResults();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const orgInviteCode = useAppStore((s) => s.orgInviteCode);
  const profile = useAppStore((s) => s.profile);

  const {
    team,
    teamAgents,
    unassignedAgents,
    loading: teamLoading,
    error: teamError,
    createTeam,
    renameTeam,
    addAgent,
    removeAgent,
  } = useTeamManagement();

  // In demo mode, filter by teamId for backward compat with mock data.
  // In Supabase mode, filter by manager's team.
  const conseillers = users.filter((u) => {
    if (u.role !== "conseiller") return false;
    if (isDemo && currentUser) return u.teamId === currentUser.teamId;
    // Supabase mode: filter by manager's team
    if (team) return u.teamId === team.id;
    return false;
  });

  // Derive effective selection: if selected user is gone from list, fall back to first
  const effectiveSelectedUserId = conseillers.some((u) => u.id === selectedUserId)
    ? selectedUserId
    : (conseillers[0]?.id ?? "");

  const selectedUser = conseillers.find((u) => u.id === effectiveSelectedUserId);
  const selectedResults = allResults.find((r) => r.userId === effectiveSelectedUserId);
  const selectedRatios =
    selectedResults && selectedUser
      ? computeAllRatios(
          selectedResults,
          selectedUser.category,
          ratioConfigs
        )
      : [];

  const invitationCode = isDemo
    ? (currentUser ? `INV-${currentUser.id}` : "")
    : (orgInviteCode ?? "Chargement...");

  const handleCopy = () => {
    navigator.clipboard.writeText(invitationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Équipe</h1>

      {/* Code d'invitation */}
      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            Code d&apos;invitation pour vos conseillers
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Partagez ce code pour qu&apos;ils rejoignent votre équipe à l&apos;inscription
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="rounded-lg bg-background px-4 py-2 text-sm font-bold text-primary">
            {invitationCode}
          </code>
          <button
            onClick={handleCopy}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Copier le code"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Team Management Panel — Supabase mode only */}
      {!isDemo && (
        <TeamManagementPanel
          team={team}
          teamAgents={teamAgents}
          unassignedAgents={unassignedAgents}
          loading={teamLoading}
          error={teamError}
          profile={profile}
          createTeam={createTeam}
          renameTeam={renameTeam}
          addAgent={addAgent}
          removeAgent={removeAgent}
        />
      )}

      {conseillers.length === 0 && isDemo ? (
        <EmptyTeamState
          invitationCode={invitationCode}
          category={currentUser?.category ?? "confirme"}
        />
      ) : conseillers.length === 0 && !isDemo ? (
        /* In Supabase mode with no team or empty team, don't show EmptyTeamState */
        null
      ) : (
        <>
      {/* View Toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setViewMode("collective")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium",
            viewMode === "collective"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Vue Collective
        </button>
        <button
          onClick={() => setViewMode("individual")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium",
            viewMode === "individual"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Vue Individuelle
        </button>
      </div>

      {viewMode === "collective" && (
        <div className="space-y-6">
          {/* ── Ratios moyens équipe ── */}
          <TeamAverageRatios
            conseillers={conseillers}
            allResults={allResults}
            ratioConfigs={ratioConfigs}
          />

          {/* ── Fiches individuelles ── */}
          <h3 className="text-base font-semibold text-foreground">
            Détail par conseiller
          </h3>
          {conseillers.map((user) => {
            const results = allResults.find((r) => r.userId === user.id);
            const ratios = results
              ? computeAllRatios(results, user.category, ratioConfigs)
              : [];
            const avgPerf =
              ratios.length > 0
                ? Math.round(
                    ratios.reduce((s, r) => s + r.percentageOfTarget, 0) /
                      ratios.length
                  )
                : 0;

            return (
              <div
                key={user.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          CATEGORY_COLORS[user.category]
                        )}
                      >
                        {CATEGORY_LABELS[user.category]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">CA</p>
                      <p className="font-bold text-foreground">
                        {results
                          ? formatCurrency(results.ventes.chiffreAffaires)
                          : "N/A"}
                      </p>
                    </div>
                    {confirmDeleteId === user.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            removeUser(user.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(user.id)}
                        title="Supprimer ce conseiller"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <ProgressBar
                  value={avgPerf}
                  label="Performance"
                  status={
                    avgPerf >= 80
                      ? "ok"
                      : avgPerf >= 60
                        ? "warning"
                        : "danger"
                  }
                  className="mt-3"
                />
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "individual" && (
        <div className="space-y-6">
          <select
            value={effectiveSelectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {conseillers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>

          {selectedUser && selectedResults && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                    {selectedUser.firstName[0]}
                    {selectedUser.lastName[0]}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        CATEGORY_COLORS[selectedUser.category]
                      )}
                    >
                      {CATEGORY_LABELS[selectedUser.category]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {selectedRatios.map((ratio) => {
                  const config =
                    ratioConfigs[ratio.ratioId as RatioId];
                  if (!config) return null;
                  return (
                    <div
                      key={ratio.ratioId}
                      className={cn(
                        "rounded-xl border bg-card p-4",
                        ratio.status === "ok"
                          ? "border-green-500/20"
                          : ratio.status === "warning"
                            ? "border-orange-500/20"
                            : "border-red-500/20"
                      )}
                    >
                      <p className="text-xs text-muted-foreground">
                        {config.name}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xl font-bold",
                          ratio.status === "ok"
                            ? "text-green-500"
                            : ratio.status === "warning"
                              ? "text-orange-500"
                              : "text-red-500"
                        )}
                      >
                        {config.isPercentage
                          ? `${Math.round(ratio.value)}%`
                          : ratio.value.toFixed(1)}
                      </p>
                      <ProgressBar
                        value={ratio.percentageOfTarget}
                        status={ratio.status}
                        showValue={false}
                        size="sm"
                        className="mt-2"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}

/* ────── Team Management Panel (Supabase mode) ────── */
function TeamManagementPanel({
  team,
  teamAgents,
  unassignedAgents,
  loading,
  error,
  profile,
  createTeam,
  renameTeam,
  addAgent,
  removeAgent,
}: {
  team: import("@/types/database").DbTeam | null;
  teamAgents: DbProfile[];
  unassignedAgents: DbProfile[];
  loading: boolean;
  error: string | null;
  profile: DbProfile | null;
  createTeam: (name: string) => Promise<void>;
  renameTeam: (name: string) => Promise<void>;
  addAgent: (agentId: string) => Promise<void>;
  removeAgent: (agentId: string) => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement de l&apos;équipe…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  // No team yet — show create CTA
  if (!team) {
    const handleCreate = async () => {
      setCreating(true);
      const firstName = profile?.first_name ?? "Manager";
      await createTeam(`Équipe de ${firstName}`);
      setCreating(false);
    };

    return (
      <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Créez votre équipe
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Créez votre équipe pour commencer à gérer vos conseillers.
        </p>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Créer mon équipe
        </button>
      </div>
    );
  }

  // Team exists — show management card
  return (
    <TeamCard
      team={team}
      teamAgents={teamAgents}
      unassignedAgents={unassignedAgents}
      renameTeam={renameTeam}
      addAgent={addAgent}
      removeAgent={removeAgent}
    />
  );
}

/* ────── Team Card (editable name + agent list + add agent) ────── */
function TeamCard({
  team,
  teamAgents,
  unassignedAgents,
  renameTeam,
  addAgent,
  removeAgent,
}: {
  team: import("@/types/database").DbTeam;
  teamAgents: DbProfile[];
  unassignedAgents: DbProfile[];
  renameTeam: (name: string) => Promise<void>;
  addAgent: (agentId: string) => Promise<void>;
  removeAgent: (agentId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(team.name);
  const [saving, setSaving] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === team.name) {
      setEditing(false);
      setEditName(team.name);
      return;
    }
    setSaving(true);
    await renameTeam(trimmed);
    setSaving(false);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(team.name);
  };

  const handleAddAgent = async () => {
    if (!selectedAgentId) return;
    setAdding(true);
    await addAgent(selectedAgentId);
    setSelectedAgentId("");
    setAdding(false);
  };

  const handleRemoveAgent = async (agentId: string) => {
    setConfirmRemoveId(null);
    await removeAgent(agentId);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Editable team name */}
      <div className="mb-4 flex items-center gap-2">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") handleCancelEdit();
              }}
              autoFocus
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-base font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Enregistrer
            </button>
            <button
              onClick={handleCancelEdit}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              Annuler
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground">{team.name}</h2>
            <button
              onClick={() => {
                setEditName(team.name);
                setEditing(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Renommer l'équipe"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Agent list */}
      <div className="mb-1">
        <p className="text-sm font-medium text-muted-foreground">
          Conseillers ({teamAgents.length})
        </p>
      </div>

      {teamAgents.length > 0 ? (
        <div className="mb-4 divide-y divide-border rounded-lg border border-border">
          {teamAgents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                  {agent.first_name[0]}
                  {agent.last_name[0]}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {agent.first_name} {agent.last_name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      CATEGORY_COLORS[agent.category]
                    )}
                  >
                    {CATEGORY_LABELS[agent.category]}
                  </span>
                </div>
              </div>

              {confirmRemoveId === agent.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRemoveAgent(agent.id)}
                    className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setConfirmRemoveId(null)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRemoveId(agent.id)}
                  title="Retirer de l'équipe"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun conseiller dans l&apos;équipe
          </p>
        </div>
      )}

      {/* Add agent form */}
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Agents non assignés ({unassignedAgents.length})
        </p>
        {unassignedAgents.length > 0 ? (
          <div className="flex items-center gap-2">
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Sélectionner un conseiller…</option>
              {unassignedAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.first_name} {agent.last_name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddAgent}
              disabled={!selectedAgentId || adding}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Ajouter
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Tous les conseillers sont assignés
          </p>
        )}
      </div>
    </div>
  );
}

/* ────── Empty Team State Component ────── */
function EmptyTeamState({
  invitationCode,
  category,
}: {
  invitationCode: string;
  category: import("@/types/user").UserCategory;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const inviteLink = buildInviteLink(invitationCode);
  const message = buildInviteMessage(invitationCode, inviteLink, category);
  const mailtoUrl = buildMailtoUrl(invitationCode, inviteLink, category);
  const whatsappUrl = buildWhatsappUrl(invitationCode, inviteLink, category);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(invitationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <UserPlus className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        Votre équipe est vide
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Partagez le code d&apos;invitation ci-dessous à vos conseillers pour
        qu&apos;ils créent leur compte et rejoignent votre équipe.
      </p>

      <div className="mt-6 flex items-center gap-2">
        <code className="rounded-lg bg-muted px-6 py-3 text-lg font-bold tracking-wider text-primary">
          {invitationCode}
        </code>
        <button
          onClick={handleCopyCode}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Copier le code"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={handleCopyMessage}
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {copiedMsg ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          {copiedMsg ? "Copié !" : "Copier le message"}
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <a
          href={mailtoUrl}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Mail className="h-4 w-4" />
          Email
        </a>
      </div>
    </div>
  );
}

/* ────── Team Average Ratios Component ────── */
function TeamAverageRatios({
  conseillers,
  allResults,
  ratioConfigs,
}: {
  conseillers: User[];
  allResults: PeriodResults[];
  ratioConfigs: Record<RatioId, RatioConfig>;
}) {
  const teamRatios = useMemo(() => {
    const allComputedByUser: ComputedRatio[][] = [];
    for (const user of conseillers) {
      const results = allResults.find((r) => r.userId === user.id);
      if (!results) continue;
      allComputedByUser.push(computeAllRatios(results, user.category, ratioConfigs));
    }
    if (allComputedByUser.length === 0) return [];

    const ratioIds = Object.keys(ratioConfigs) as RatioId[];
    return ratioIds.map((id) => {
      const config = ratioConfigs[id];
      const values = allComputedByUser
        .map((ratios) => ratios.find((r) => r.ratioId === id))
        .filter(Boolean) as ComputedRatio[];
      const avgValue = values.length > 0
        ? values.reduce((s, r) => s + r.value, 0) / values.length
        : 0;
      const avgPct = values.length > 0
        ? Math.round(values.reduce((s, r) => s + r.percentageOfTarget, 0) / values.length)
        : 0;
      const status: "ok" | "warning" | "danger" =
        avgPct >= 80 ? "ok" : avgPct >= 60 ? "warning" : "danger";
      return { id, config, avgValue, avgPct, status };
    });
  }, [conseillers, allResults, ratioConfigs]);

  if (teamRatios.length === 0) return null;

  const globalAvg = Math.round(
    teamRatios.reduce((s, r) => s + r.avgPct, 0) / teamRatios.length
  );
  const globalStatus: "ok" | "warning" | "danger" =
    globalAvg >= 80 ? "ok" : globalAvg >= 60 ? "warning" : "danger";

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
            <UsersIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Performance moyenne de l&apos;équipe
            </h2>
            <p className="text-sm text-muted-foreground">
              Moyenne des {conseillers.length} conseillers sur chaque ratio
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Score global</p>
          <p className={cn(
            "text-2xl font-bold",
            globalStatus === "ok" ? "text-green-500" : globalStatus === "warning" ? "text-orange-500" : "text-red-500"
          )}>
            {globalAvg}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {teamRatios.map((r) => (
          <div
            key={r.id}
            className={cn(
              "rounded-xl border bg-card p-4",
              r.status === "ok"
                ? "border-green-500/20"
                : r.status === "warning"
                  ? "border-orange-500/20"
                  : "border-red-500/20"
            )}
          >
            <p className="text-xs text-muted-foreground">{r.config.name}</p>
            <p className={cn(
              "mt-1 text-xl font-bold",
              r.status === "ok" ? "text-green-500" : r.status === "warning" ? "text-orange-500" : "text-red-500"
            )}>
              {r.config.isPercentage
                ? `${Math.round(r.avgValue)}%`
                : r.avgValue.toFixed(1)}
            </p>
            <ProgressBar
              value={r.avgPct}
              status={r.status}
              showValue={false}
              size="sm"
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {r.avgPct}% de l&apos;objectif
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
