import Link from "next/link";
import { Home, PlayCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <span className="text-5xl font-bold text-primary">404</span>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-foreground">
          Oups, cette page n&apos;existe pas
        </h1>

        <p className="mb-8 text-sm text-muted-foreground">
          La page que tu cherches a peut-être été déplacée ou supprimée.
          Pas de panique, on te remet sur les rails.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            Retour au dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <PlayCircle className="h-4 w-4" />
            Tester la démo
          </Link>
        </div>
      </div>
    </div>
  );
}
