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
  Eye,
  ClipboardList,
  Zap,
  Activity,
  Calendar,
  Dumbbell,
  UserCheck,
  HeartHandshake,
} from "lucide-react";

export const metadata = {
  title: "Pourquoi NXT Performance ?",
  description:
    "NXT Performance lit votre activité, détecte votre point de douleur, prescrit la bonne action. Un système de prescription silencieuse piloté par le Copilote NXT, conçu par des coachs métier.",
};

const CTA_HREF = "/welcome";
const CTA_LABEL = "Créer mon compte gratuit 1 mois";
const CTA_SUBLINE = "1 mois d'essai complet, sans carte bancaire";

export default function PourquoiNxtPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-foreground">
            NXT Performance
          </Link>
          <Link
            href={CTA_HREF}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {CTA_LABEL}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Compass className="h-3.5 w-3.5" />
          Cockpit de performance immobilière · Conçu par des coachs métier
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground md:text-5xl">
          NXT Performance lit votre activité, détecte la bonne douleur, et{" "}
          <span className="text-primary">prescrit la bonne action.</span>
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Pas un tableau de bord de plus. Un système de prescription silencieuse
          piloté par le Copilote NXT, qui traduit vos chiffres en décisions et
          active les bons outils, au bon moment.
        </p>
        <Link
          href={CTA_HREF}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        >
          {CTA_LABEL}
          <ArrowRight className="h-5 w-5" />
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">{CTA_SUBLINE}</p>
      </section>

      {/* AFFICHER N'EST PAS DÉCIDER */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Lightbulb className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Afficher des données n&apos;a jamais fait progresser un conseiller.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-muted-foreground">
            Les outils immobiliers classiques donnent à voir ce qui s&apos;est
            passé. Des courbes, des volumes, des totaux. À vous d&apos;interpréter,
            de prioriser, de décider. À la fin du mois, le constat est le même
            que le mois précédent : on sait qu&apos;on sous-performe, on ne sait
            toujours pas par où commencer.
          </p>
          <p className="mt-4 text-base font-medium leading-relaxed text-foreground">
            Notre conviction est simple : un dashboard qui ne déclenche pas de
            décision est un dashboard inutile. Entre{" "}
            <span className="text-primary">afficher des chiffres</span> et{" "}
            <span className="text-primary">décider quoi en faire</span>, il y a
            toute la différence entre un logiciel de suivi et un système de
            performance.
          </p>
        </div>
      </section>

      {/* COPILOTE NXT — 5 VERBES */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Au cœur de NXT Performance
          </div>
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Comment le Copilote NXT transforme une donnée en action
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Le Copilote NXT travaille en permanence, sans chat intrusif ni
            pop-up. Il lit l&apos;activité du conseiller, détecte le point de
            douleur principal, prescrit la bonne action, et active les briques
            qui répondent à cette douleur. Le conseiller ne navigue pas entre
            des modules : le système décide, puis active.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <PrescriptionStep
            verb="LIT"
            icon={Eye}
            title="la performance"
            description="Il observe en continu les 7 ratios de la chaîne de production et les 6 axes du DPI. Rien à saisir manuellement, rien à interpréter soi-même."
          />
          <PrescriptionStep
            verb="DÉTECTE"
            icon={Target}
            title="la douleur"
            description="Il identifie le ratio le plus coûteux en euros et l'axe DPI qui bloque la progression. C'est la douleur principale, celle sur laquelle toute l'énergie doit être concentrée."
          />
          <PrescriptionStep
            verb="PRESCRIT"
            icon={ClipboardList}
            title="l'action"
            description="Il formule une recommandation ciblée : un plan 30 jours focalisé sur le bon levier, un entraînement pour la technique qui bloque, un appui coaching si l'écart est profond."
          />
          <PrescriptionStep
            verb="ACTIVE"
            icon={Zap}
            title="les bons leviers"
            description="Il enclenche les briques du flywheel — NXT Data, Plan 30 jours, NXT Training, NXT Profiling, NXT Coaching — selon le diagnostic, pas selon l'humeur du conseiller."
          />
          <PrescriptionStep
            verb="AUGMENTE"
            icon={TrendingUp}
            title="la performance"
            description="Chaque cycle est mesuré : ratios avant / après, projection de CA chiffrée, ROI validé ou ajusté. La prescription du cycle suivant tient compte des résultats du précédent."
          />
        </div>

        <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-sm leading-relaxed text-foreground md:text-base">
            <span className="font-semibold">
              Ce n&apos;est pas un assistant IA de plus.
            </span>{" "}
            C&apos;est un moteur d&apos;orchestration silencieux, intégré à la
            plateforme, qui traduit de la performance en décisions concrètes.
            Le <span className="font-medium">Copilote Coach</span> — qui
            prolonge le coach humain entre deux sessions — n&apos;est qu&apos;un
            des instruments que le Copilote NXT active quand le diagnostic le
            justifie.
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
            Comparez ce que vous obtenez avec un CRM immobilier classique versus
            NXT Performance.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px]">
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
                generalist="Des ingénieurs logiciel"
                nxt="Des coachs immobiliers avec 15 ans de terrain"
              />
              <ComparisonRow
                criterion="Le rôle de l'outil"
                generalist="Afficher des chiffres"
                nxt="Décider quoi en faire et l'activer"
                emphasis
              />
              <ComparisonRow
                criterion="Ce qu'il vous montre"
                generalist="Des chiffres bruts à interpréter"
                nxt="Un diagnostic clair : forces, faiblesses, douleur principale"
              />
              <ComparisonRow
                criterion="Le moteur de décision"
                generalist="Aucun. Vous décidez seul."
                nxt="Le Copilote NXT — orchestrateur silencieux qui prescrit et active les bonnes briques"
                emphasis
              />
              <ComparisonRow
                criterion="Le contenu coaching"
                generalist="Absent ou générique"
                nxt="Fiches rédigées par des coachs, activées automatiquement selon la douleur détectée"
              />
              <ComparisonRow
                criterion="Le ROI"
                generalist="Affiche le CA passé"
                nxt="Projette le CA futur selon les actions prescrites (+X € / an)"
              />
              <ComparisonRow
                criterion="Le coaching humain"
                generalist="Hors de l'outil"
                nxt="Intégré au flywheel, déclenché au bon moment — enrichi par le Copilote Coach entre deux sessions"
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* FLYWHEEL — 6 BRIQUES */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Le flywheel — 6 briques prescrites automatiquement selon la douleur
            détectée
          </h2>
          <p className="mx-auto max-w-3xl text-muted-foreground">
            Le Copilote NXT dispose aujourd&apos;hui de 6 briques qu&apos;il
            active de manière ciblée. Aucune n&apos;est proposée au hasard :
            chacune répond à une catégorie de douleur que les coachs Start
            Academy ont identifiée sur 15 ans de terrain.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FlywheelStep
            number="1"
            icon={Target}
            title="DPI"
            subtitle="Diagnostic de performance immobilière"
            description="Score sur 100 et 6 axes. Porte d'entrée gratuite. Point de départ de toute prescription."
          />
          <FlywheelStep
            number="2"
            icon={Activity}
            title="NXT Data"
            subtitle="Cockpit quotidien"
            description="Les 7 ratios de la chaîne de production, lus en continu. C'est sur cette lecture que le Copilote NXT détecte la douleur."
          />
          <FlywheelStep
            number="3"
            icon={Calendar}
            title="Plan 30 jours"
            subtitle="Feuille de route ciblée"
            description="Un plan d'action concret focalisé sur le ratio le plus coûteux en euros. Une seule douleur à la fois."
          />
          <FlywheelStep
            number="4"
            icon={Dumbbell}
            title="NXT Training"
            subtitle="Entraînement sur la technique qui bloque"
            description="Simulations, exercices et scripts activés quand la douleur est technique (découverte, argumentation, closing)."
          />
          <FlywheelStep
            number="5"
            icon={UserCheck}
            title="NXT Profiling"
            subtitle="Lecture du client"
            description="Adaptation de la posture commerciale selon le profil acheteur / vendeur. Activé quand la douleur est relationnelle."
          />
          <FlywheelStep
            number="6"
            icon={HeartHandshake}
            title="NXT Coaching"
            subtitle="Coach humain + Copilote Coach"
            description="Accompagnement direct par un coach certifié, prolongé par un Copilote Coach qui distille les recaps et maintient l'élan entre deux sessions."
          />
        </div>

        {/* BLOC TRAJECTOIRE */}
        <div className="mt-10 rounded-xl border border-border bg-muted/30 p-6 md:p-8">
          <h3 className="mb-3 text-lg font-bold text-foreground">
            La suite de la trajectoire produit
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Deux briques entrent{" "}
            <span className="font-semibold text-foreground">
              bientôt dans l&apos;orchestration
            </span>{" "}
            : <span className="font-semibold text-foreground">NXT Finance</span>{" "}
            (pilotage des marges, défense du prix, écart estimation / signé) et{" "}
            <span className="font-semibold text-foreground">
              NXT Croissance
            </span>{" "}
            (structuration du développement commercial et du portefeuille).{" "}
            <span className="font-semibold text-foreground">NXT Juridique</span>{" "}
            rejoindra ensuite l&apos;écosystème. Chaque nouvelle brique sera
            activée par le même moteur — le Copilote NXT — selon la même
            logique de prescription.
          </p>
        </div>
      </section>

      {/* CONÇU PAR DES COACHS MÉTIER */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-xl border border-border bg-card p-8 md:p-10">
          <div className="mb-6 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              Conçu par des coachs métier, pas par des développeurs.
            </h2>
            <p className="mx-auto max-w-3xl text-muted-foreground">
              Chaque ratio, chaque seuil, chaque recommandation du Copilote NXT
              vient de 15 ans de coaching terrain chez Start Academy. Ce ne
              sont pas des hypothèses techniques — ce sont les observations
              quotidiennes des formateurs qui accompagnent les conseillers en
              cabinet, semaine après semaine.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <CoachPillar
              title="Les 7 ratios"
              description="Ceux que les coachs suivent avec leurs conseillers depuis dix ans. Pas un choix de produit — un choix métier."
            />
            <CoachPillar
              title="Les seuils de performance"
              description="Calibrés par catégorie (Junior · Confirmé · Expert), sur la base des données agrégées de milliers d'accompagnements."
            />
            <CoachPillar
              title="Les fiches d'expertise"
              description="Activées par le Copilote NXT, rédigées par les coachs qui les utilisent quotidiennement en cabinet."
            />
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Ce que disent les conseillers qui utilisent le système
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
            Prêt à laisser le Copilote NXT diagnostiquer votre performance ?
          </h2>
          <p className="mb-6 text-muted-foreground">
            Créez votre compte en 2 minutes. Accès complet à NXT Performance
            pendant 1 mois, sans carte bancaire. Le Copilote NXT commence à
            prescrire dès votre première saisie.
          </p>
          <Link
            href={CTA_HREF}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            {CTA_LABEL}
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">{CTA_SUBLINE}</p>
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
  emphasis = false,
}: {
  criterion: string;
  generalist: string;
  nxt: string;
  emphasis?: boolean;
}) {
  return (
    <tr
      className={
        emphasis
          ? "border-t border-border bg-primary/5"
          : "border-t border-border"
      }
    >
      <td className="px-4 py-4 text-sm font-semibold text-foreground">
        {criterion}
      </td>
      <td className="px-4 py-4 text-sm text-muted-foreground">{generalist}</td>
      <td
        className={
          emphasis
            ? "px-4 py-4 text-sm font-semibold text-foreground"
            : "px-4 py-4 text-sm font-medium text-foreground"
        }
      >
        {nxt}
      </td>
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
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function PrescriptionStep({
  verb,
  icon: Icon,
  title,
  description,
}: {
  verb: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
        {verb}
      </p>
      <h3 className="mt-0.5 mb-3 text-base font-bold text-foreground">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function CoachPillar({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="mb-2 flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
          {title}
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function Testimonial({ quote, author }: { quote: string; author: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-3 text-3xl text-primary/30">&ldquo;</div>
      <p className="mb-4 text-sm italic leading-relaxed text-foreground">
        {quote}
      </p>
      <p className="text-xs font-medium text-muted-foreground">— {author}</p>
    </div>
  );
}
