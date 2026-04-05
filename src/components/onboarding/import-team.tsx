"use client";

import { useState, useRef } from "react";
import { Upload, Users, Loader2, Check, AlertCircle, X, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

interface DetectedMember {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  status: "new" | "existing";
}

interface ImportTeamProps {
  isDemo?: boolean;
}

export function ImportTeam({ isDemo }: ImportTeamProps) {
  const router = useRouter();
  const [members, setMembers] = useState<DetectedMember[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");

    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 1200));
        setMembers([
          { id: "1", nom: "Martin", prenom: "Thomas", email: "", status: "new" },
          { id: "2", nom: "Dupont", prenom: "Lucie", email: "", status: "new" },
          { id: "3", nom: "Blanc", prenom: "Roger", email: "", status: "new" },
        ]);
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/import-performance", { method: "POST", body: formData });
        const json = await res.json();
        if (res.ok && json.individuals?.length) {
          setMembers(json.individuals.map((ind: { nom: string; prenom: string }, i: number) => ({
            id: String(i),
            nom: ind.nom || "",
            prenom: ind.prenom || "",
            email: "",
            status: "new" as const,
          })));
        } else {
          setError("Aucun collaborateur détecté dans ce fichier");
        }
      }
    } catch {
      setError("Erreur lors de l'analyse du fichier");
    } finally {
      setUploading(false);
    }
  };

  const updateEmail = (id: string, email: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, email } : m));
  };

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const validMembers = members.filter(m => m.email.includes("@"));
  const totalPrice = validMembers.length * 9;

  if (members.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-base font-semibold text-foreground">Importer votre équipe</h2>
          <p className="text-xs text-muted-foreground mt-1">Importez un fichier avec les données de vos conseillers</p>
        </div>

        <div
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <Users className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">{uploading ? "Analyse en cours..." : "Importer un fichier équipe"}</p>
          <p className="text-[10px] text-muted-foreground">Excel (.xlsx, .csv) ou PDF</p>
        </div>

        {error && <p className="text-center text-xs text-destructive">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-base font-semibold text-foreground">Équipe détectée</h2>
        <p className="text-xs text-muted-foreground mt-1">Complétez les emails pour créer les comptes</p>
      </div>

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{m.prenom} {m.nom}</p>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="email"
                value={m.email}
                onChange={(e) => updateEmail(m.id, e.target.value)}
                placeholder="email@agence.fr"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {m.status === "existing" && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">Existant</span>
            )}
            <button type="button" onClick={() => removeMember(m.id)} className="text-muted-foreground hover:text-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {validMembers.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">
            {validMembers.length} compte{validMembers.length > 1 ? "s" : ""} = {totalPrice}€/mois
          </p>
          <button
            type="button"
            onClick={() => router.push(`/souscrire?plan=team&seats=${validMembers.length}`)}
            className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Procéder au paiement
          </button>
        </div>
      )}
    </div>
  );
}
