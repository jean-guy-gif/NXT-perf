"use client";

import { useState, useEffect } from "react";
import { Users, Copy, Check, RefreshCw } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

export default function EquipeParametresPage() {
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);

  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<{ id: string; first_name: string; last_name: string; role: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const isManager = user?.mainRole === "manager" || user?.role === "manager";

  useEffect(() => {
    if (isDemo || !user?.id || !isManager) return;
    const supabase = createClient();

    // Load my team
    supabase.from("teams").select("id, name, code_equipe").eq("manager_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setTeamId(data.id);
          setTeamCode(data.code_equipe);
          setTeamName(data.name);

          // Load team members
          supabase.from("profiles").select("id, first_name, last_name, role").eq("team_id", data.id)
            .then(({ data: m }) => { if (m) setMembers(m); });
        }
      });
  }, [user?.id, isDemo, isManager]);

  const handleCopy = () => {
    if (!teamCode) return;
    navigator.clipboard.writeText(teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!teamId) return;
    setRegenerating(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("regenerate_team_code", { p_team_id: teamId });
    if (data?.new_code) setTeamCode(data.new_code);
    setRegenerating(false);
  };

  if (!isManager) {
    return <div className="text-sm text-muted-foreground">Cette page est réservée aux managers.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5" /> Mon équipe
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{teamName || "Gestion de votre équipe"}</p>
      </div>

      {/* Team code */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Code d'invitation équipe</h2>
        <p className="text-xs text-muted-foreground">Partagez ce code pour que des conseillers rejoignent votre équipe.</p>
        <div className="flex items-center gap-3">
          <code className="rounded-lg bg-muted px-4 py-2 text-lg font-mono font-bold text-foreground">{teamCode || "—"}</code>
          <button type="button" onClick={handleCopy} disabled={!teamCode} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 disabled:opacity-50">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié" : "Copier"}
          </button>
          <button type="button" onClick={handleRegenerate} disabled={regenerating} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
            Régénérer
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">La régénération invalide le code pour les nouveaux entrants, sans décrocher les membres existants.</p>
      </section>

      {/* Members */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Membres ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun membre dans l'équipe.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
