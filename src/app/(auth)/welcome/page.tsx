"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, UserCheck } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-14 w-14" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Bienvenue sur NXT-Perf
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        La plateforme de performance pour les professionnels de l&apos;immobilier
      </p>

      <div className="space-y-3">
        <button
          onClick={() => router.push("/register?role=manager")}
          className="flex w-full items-center gap-4 rounded-xl border border-input bg-background p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Je suis Manager</p>
            <p className="text-sm text-muted-foreground">
              Créez votre équipe et pilotez la performance de vos conseillers
            </p>
          </div>
        </button>

        <button
          onClick={() => router.push("/register?role=conseiller")}
          className="flex w-full items-center gap-4 rounded-xl border border-input bg-background p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Je suis Conseiller</p>
            <p className="text-sm text-muted-foreground">
              Rejoignez l&apos;équipe de votre manager avec un code d&apos;invitation
            </p>
          </div>
        </button>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
