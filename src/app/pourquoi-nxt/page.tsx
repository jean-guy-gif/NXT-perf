import Link from "next/link";
import {
  ArrowRight,
  Target,
  Compass,
  Lightbulb,
  Users,
  TrendingUp,
  X,
  Check,
} from "lucide-react";

export const metadata = {
  title: "Pourquoi NXT Performance ?",
  description:
    "Le premier cockpit de performance immobilière conçu par des coachs métier, pas par des développeurs.",
};

export default function PourquoiNxtPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-foreground">
            NXT Performance
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tester la démo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Compass className="h-3.5 w-3.5" />
          Cockpit de performance immobilière
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground md:text-5xl">
          NXT Performance, c&apos;est le premier cockpit de performance
          immobilière{" "}
          <span className="text-primary">conçu par des coachs métier.</span>
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Pas par des développeurs. La différence se voit dans chaque
          fonctionnalité.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        >
          Tester la démo gratuitement
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      {/* LE PROBLÈME */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Lightbulb className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Le problème avec les logiciels classiques
            </h2>
          </div>
          <p className="text-base leading-relaxed text-muted-foreground">
            Les logiciels immobiliers classiques te montrent des chiffres.
            Ils ne te disent pas quoi en faire. Tu repars avec un tableau
            de bord, mais sans plan. Tu sais que tu sous-performes, mais
            tu ne sais pas pourquoi ni comment corriger.
          </p>
          <p className="mt-4 text-base font-medium leading-relaxed text-foreground">
            Notre conviction : un dashboard qui ne déclenche pas d&apos;action
            est un dashboard inutile.
          </p>
        </div>
      </section>

      {/* TABLEAU COMPARATIF */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Notre différence
          </h2>
          <p className="text-muted-foreground">
            Compare ce que tu obtiens avec un CRM immobilier classique
            versus NXT Performance.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-4 text-left text-sm font-semibold text-foreground"></th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-500" />
                    CRM / logiciel généraliste
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-primary">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    NXT Performance
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow
                criterion="Qui l'a conçu ?"
                generalist="Des ingénieurs logiciels"
                nxt="Des coachs immobiliers avec 15 ans de terrain"
              />
              <ComparisonRow
                criterion="Ce qu'il te montre"
                generalist="Des chiffres à interpréter toi-même"
                nxt="Un diagnostic qui t'explique tes forces et faiblesses"
              />
              <ComparisonRow
                criterion="Ce qu'il te recommande"
                generalist="Rien. À toi de décider."
                nxt="Un plan d'action 30 jours focalisé sur ta plus grosse douleur"
              />
              <ComparisonRow
                criterion="Le contenu coaching"
                generalist="Absent ou générique"
                nxt="Fiches d'expertise rédigées par des coachs pour chaque levier"
              />
              <ComparisonRow
                criterion="Le ROI"
                generalist="Affiche le CA passé"
                nxt="Projette le CA futur selon tes actions (+X € /an)"
              />
              <ComparisonRow
                criterion="Le coaching humain"
                generalist="Pas prévu dans l'outil"
                nxt="Raccordement direct avec un coach certifié"
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* FLYWHEEL */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Comment ça marche — le flywheel
          </h2>
          <p className="text-muted-foreground">
            Une boucle de progression structurée, pas un tableau de bord isolé.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FlywheelStep
            number="1"
            icon={Target}
            title="DPI"
            subtitle="Diagnostic de Performance Immobilière"
            description="Ton score sur 100 et 6 axes de performance. Tu comprends où tu en es."
          />
          <FlywheelStep
            number="2"
            icon={Compass}
            title="Plan 30j"
            subtitle="Focalisé sur 1 douleur"
            description="Un plan d'action concret ciblé sur le ratio qui te coûte le plus en €."
          />
          <FlywheelStep
            number="3"
            icon={TrendingUp}
            title="Debrief IA"
            subtitle="ROI chiffré"
            description="Ton bilan après 30 jours : actions validées, gain en €, écart avec/sans coach."
          />
          <FlywheelStep
            number="4"
            icon={Users}
            title="Coach humain"
            subtitle="Accompagnement direct"
            description="Un coach certifié prend le relais pour aller plus loin que l'IA."
          />
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Ce que nous disent les conseillers Start Academy
          </h2>
          <p className="text-muted-foreground">
            Paraphrases honnêtes de retours oraux recueillis en coaching.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Testimonial
            quote="Avant, je savais que mes chiffres étaient mauvais. Maintenant, je sais pourquoi."
            author="Un conseiller confirmé, Sud-Est"
          />
          <Testimonial
            quote="J'ai arrêté de me disperser. Je travaille un seul levier par mois, et je vois les résultats."
            author="Une conseillère junior, Île-de-France"
          />
          <Testimonial
            quote="Ce que j'apprécie, c'est qu'on me dit pas juste ce que je fais mal. On me montre comment les meilleurs font."
            author="Un conseiller expert, PACA"
          />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-10">
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Prêt à tester par toi-même ?
          </h2>
          <p className="mb-6 text-muted-foreground">
            En 5 minutes, obtiens ton score DPI, ton plan d&apos;action 30
            jours, et projette ton ROI.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            Tester la démo gratuitement
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card/30 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground">
          NXT Performance · Conçu par Start Academy · 15 ans de coaching
          immobilier
        </div>
      </footer>
    </div>
  );
}

function ComparisonRow({
  criterion,
  generalist,
  nxt,
}: {
  criterion: string;
  generalist: string;
  nxt: string;
}) {
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-4 text-sm font-semibold text-foreground">{criterion}</td>
      <td className="px-4 py-4 text-sm text-muted-foreground">{generalist}</td>
      <td className="px-4 py-4 text-sm font-medium text-foreground">{nxt}</td>
    </tr>
  );
}

function FlywheelStep({
  number,
  icon: Icon,
  title,
  subtitle,
  description,
}: {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  description: string;
}) {
  return (
    <div className="relative rounded-xl border border-border bg-card p-6">
      <div className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md">
        {number}
      </div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-1 text-lg font-bold text-foreground">{title}</h3>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
        {subtitle}
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function Testimonial({ quote, author }: { quote: string; author: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-3 text-3xl text-primary/30">&ldquo;</div>
      <p className="mb-4 text-sm italic leading-relaxed text-foreground">{quote}</p>
      <p className="text-xs font-medium text-muted-foreground">— {author}</p>
    </div>
  );
}
