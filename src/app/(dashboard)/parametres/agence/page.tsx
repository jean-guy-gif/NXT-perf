"use client";

import { useState, useEffect } from "react";
import { Building2, Copy, Check, RefreshCw, Users } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

export default function AgenceParametresPage() {
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [codeAgence, setCodeAgence] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string; code_equipe: string | null; member_count?: number }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const isDirecteur = user?.mainRole === "directeur" || user?.role === "directeur";

  useEffect(() => {
    if (isDemo || !user?.id) return;
    const supabase = createClient();

    supabase.from("profiles").select("org_id").eq("id", user.id).single()
      .then(({ data }) => {
        if (!data?.org_id) return;
        setOrgId(data.org_id);

        supabase.from("organizations").select("name, code_agence, invite_code").eq("id", data.org_id).single()
          .then(({ data: org }) => {
            if (org) {
              setOrgName(org.name);
              setCodeAgence(org.code_agence);
              setInviteCode(org.invite_code);
            }
          });

        supabase.from("teams").select("id, name, code_equipe").eq("org_id", data.org_id)
          .then(({ data: t }) => { if (t) setTeams(t); });
      });
  }, [user?.id, isDemo]);

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegenerate = async () => {
    if (!orgId) return;
    setRegenerating(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("regenerate_agency_code", { p_org_id: orgId });
    if (data?.new_code) setCodeAgence(data.new_code);
    setRegenerating(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Mon agence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{orgName || "Gestion de votre agence"}</p>
      </div>

      {/* Agency codes */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Codes d'invitation</h2>

        {codeAgence && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Code agence (directeurs / managers)</p>
            <div className="flex items-center gap-3">
              <code className="rounded bg-muted px-3 py-1.5 text-base font-mono font-bold">{codeAgence}</code>
              <button type="button" onClick={() => handleCopy(codeAgence, "agence")} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                {copied === "agence" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "agence" ? "Copié" : "Copier"}
              </button>
              {isDirecteur && (
                <button type="button" onClick={handleRegenerate} disabled={regenerating} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                  Régénérer
                </button>
              )}
            </div>
          </div>
        )}

        {inviteCode && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Code invitation (conseillers)</p>
            <div className="flex items-center gap-3">
              <code className="rounded bg-muted px-3 py-1.5 text-base font-mono font-bold">{inviteCode}</code>
              <button type="button" onClick={() => handleCopy(inviteCode, "invite")} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                {copied === "invite" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "invite" ? "Copié" : "Copier"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Teams */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Équipes ({teams.length})</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune équipe dans cette agence.</p>
        ) : (
          <div className="space-y-2">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    {t.code_equipe && <p className="text-xs text-muted-foreground font-mono">{t.code_equipe}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
