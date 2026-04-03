"use client";

import { useState, useEffect } from "react";
import { Users, Copy, Check, XCircle, Link2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import type { DbCoachingLink } from "@/types/database";

export default function CoachingParametresPage() {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [coachCode, setCoachCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState<(DbCoachingLink & { coachee_name?: string })[]>([]);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemResult, setRedeemResult] = useState<string | null>(null);

  const isCoach = user?.mainRole === "coach" || user?.availableRoles?.includes("coach");
  const isCoachee = user?.mainRole === "conseiller" || user?.mainRole === "manager" || user?.mainRole === "directeur";

  useEffect(() => {
    if (isDemo || !user?.id) return;
    const supabase = createClient();

    // Load coach code if coach
    if (isCoach) {
      supabase.from("profiles").select("coach_code").eq("id", user.id).single()
        .then(({ data }) => setCoachCode(data?.coach_code ?? null));

      // Load coaching links
      supabase.from("coaching_links").select("*").eq("coach_user_id", user.id)
        .then(({ data }) => {
          if (data) setLinks(data);
        });
    }

    // Load my coach link if coachee
    if (isCoachee) {
      supabase.from("coaching_links").select("*").eq("coachee_user_id", user.id)
        .then(({ data }) => {
          if (data) setLinks(data);
        });
    }
  }, [user?.id, isDemo, isCoach, isCoachee]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    const supabase = createClient();
    const { data } = await supabase.rpc("redeem_coach_code", { p_code: redeemCode.trim() });
    if (data?.error) {
      setRedeemResult(data.error);
    } else {
      setRedeemResult("Coach rattaché avec succès !");
      setRedeemCode("");
    }
  };

  const handleRevoke = async (linkId: string) => {
    const supabase = createClient();
    await supabase.rpc("revoke_coaching_link", { p_link_id: linkId });
    setLinks((prev) => prev.map((l) => l.id === linkId ? { ...l, revoked_at: new Date().toISOString() } : l));
  };

  const activeLinks = links.filter((l) => !l.revoked_at);
  const revokedLinks = links.filter((l) => l.revoked_at);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5" /> Coaching
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gérer vos liens de coaching.</p>
      </div>

      {/* Coach section: share code + manage links */}
      {isCoach && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Mon code coach</h2>
          {coachCode ? (
            <div className="flex items-center gap-3">
              <code className="rounded-lg bg-muted px-4 py-2 text-lg font-mono font-bold text-foreground">{coachCode}</code>
              <button type="button" onClick={() => handleCopy(coachCode)} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun code coach généré.</p>
          )}

          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mt-6">Mes coachés</h2>
          {activeLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun coaché actif.</p>
          ) : (
            <div className="space-y-2">
              {activeLinks.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{l.coachee_user_id.slice(0, 8)}…</p>
                    <p className="text-xs text-muted-foreground">{l.coachee_role}</p>
                  </div>
                  <button type="button" onClick={() => handleRevoke(l.id)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" /> Révoquer
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Coachee section: redeem coach code */}
      {isCoachee && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Rattacher un coach</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              placeholder="Code coach (ex: CO-XXXXXX)"
              className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm"
            />
            <button type="button" onClick={handleRedeem} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Link2 className="h-4 w-4" />
            </button>
          </div>
          {redeemResult && <p className="text-xs text-muted-foreground">{redeemResult}</p>}

          {activeLinks.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mt-4">Mon coach</h2>
              {activeLinks.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-sm text-foreground">Coach : {l.coach_user_id.slice(0, 8)}…</p>
                  <button type="button" onClick={() => handleRevoke(l.id)} className="text-xs text-red-400 hover:text-red-300">Se détacher</button>
                </div>
              ))}
            </>
          )}
        </section>
      )}
    </div>
  );
}
