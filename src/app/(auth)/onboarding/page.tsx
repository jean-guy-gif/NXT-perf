"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Users,
  UserCheck,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import { isInstitutionCode, isTeamCode } from "@/lib/codes";
import {
  saveOnboardingDraft,
  loadOnboardingDraft,
  clearOnboardingDraft,
} from "@/lib/onboarding-storage";
import { InviteSharePanel } from "@/components/onboarding/invite-share-panel";
import type { ProfileType } from "@/types/user";
import type { OnboardingState, OnboardingStep } from "@/types/onboarding";
import { initialOnboardingState } from "@/types/onboarding";

/* ════════════════════════════════════════════════════════════════════ */

function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinCode = searchParams.get("join") ?? "";

  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const createInstitution = useAppStore((s) => s.createInstitution);
  const joinInstitution = useAppStore((s) => s.joinInstitution);
  const joinTeam = useAppStore((s) => s.joinTeam);
  const createPersonalTeam = useAppStore((s) => s.createPersonalTeam);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [state, setState] = useState<OnboardingState>(initialOnboardingState);
  const [error, setError] = useState("");

  // If user already completed onboarding, redirect
  useEffect(() => {
    if (user?.onboardingStatus === "DONE") {
      router.replace("/dashboard");
    }
  }, [user?.onboardingStatus, router]);

  // If not authenticated, redirect to welcome
  // Check Supabase session directly (store may not be hydrated yet)
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    if (isAuthenticated) { setAuthChecked(true); return; }
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/welcome");
      }
      setAuthChecked(true);
    });
  }, [isAuthenticated, router]);

  // Restore draft on mount
  useEffect(() => {
    const draft = loadOnboardingDraft();
    if (draft) {
      setState(draft);
    }
  }, []);

  // Handle ?join= param — skip to the right flow
  useEffect(() => {
    if (!joinCode) return;
    if (isInstitutionCode(joinCode)) {
      setState({
        profileType: "MANAGER",
        currentStep: "MANAGER_JOIN",
        joinCode,
      });
    } else if (isTeamCode(joinCode)) {
      setState({
        profileType: "AGENT",
        currentStep: "AGENT_JOIN",
        joinCode,
      });
    }
  }, [joinCode]);

  // Persist draft on state changes
  useEffect(() => {
    if (state.currentStep !== "PROFILE_TYPE") {
      saveOnboardingDraft(state);
    }
  }, [state]);

  const goTo = useCallback((step: OnboardingStep, extra?: Partial<OnboardingState>) => {
    setError("");
    setState((s) => ({ ...s, ...extra, currentStep: step }));
  }, []);

  const finish = useCallback(
    (profileType: ProfileType) => {
      clearOnboardingDraft();
      completeOnboarding(profileType);
      router.replace("/dashboard");
    },
    [completeOnboarding, router]
  );

  if (!isAuthenticated || user?.onboardingStatus === "DONE") return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-14 w-14" />
      </div>

      {/* ── Step 0: Profile Type ── */}
      {state.currentStep === "PROFILE_TYPE" && (
        <ProfileTypeStep
          onSelect={(profileType) => {
            setError("");
            if (profileType === "INSTITUTION") {
              goTo("INSTITUTION_NAME", { profileType });
            } else if (profileType === "MANAGER") {
              goTo("MANAGER_JOIN", { profileType });
            } else if (profileType === "AGENT") {
              goTo("AGENT_JOIN", { profileType });
            } else {
              // COACH — immediate
              completeOnboarding("COACH");
              clearOnboardingDraft();
              router.replace("/dashboard");
            }
          }}
        />
      )}

      {/* ── Flow A: Create Institution ── */}
      {state.currentStep === "INSTITUTION_NAME" && (
        <InstitutionNameStep
          initialName={state.institutionName ?? ""}
          onBack={() => goTo("PROFILE_TYPE", { profileType: null })}
          onNext={(name) => goTo("INSTITUTION_CONFIRM", { institutionName: name })}
        />
      )}

      {state.currentStep === "INSTITUTION_CONFIRM" && (
        <InstitutionConfirmStep
          institutionName={state.institutionName ?? ""}
          userName={user ? `${user.firstName} ${user.lastName}` : ""}
          onBack={() => goTo("INSTITUTION_NAME")}
          onConfirm={() => {
            const result = createInstitution(state.institutionName ?? "Mon agence");
            goTo("INSTITUTION_SUCCESS", {
              agCode: result.agCode,
              mgCode: result.mgCode,
              institutionId: result.institutionId,
              teamId: result.teamId,
            });
          }}
        />
      )}

      {state.currentStep === "INSTITUTION_SUCCESS" && (
        <InstitutionSuccessStep
          agCode={state.agCode ?? ""}
          mgCode={state.mgCode ?? ""}
          institutionName={state.institutionName ?? ""}
          onFinish={() => finish("INSTITUTION")}
        />
      )}

      {/* ── Flow B: Manager ── */}
      {state.currentStep === "MANAGER_JOIN" && (
        <ManagerJoinStep
          initialCode={state.joinCode ?? ""}
          error={error}
          onBack={() => goTo("PROFILE_TYPE", { profileType: null })}
          onCreateInstead={() => goTo("INSTITUTION_NAME", { profileType: "INSTITUTION" })}
          onJoin={(code) => {
            const result = joinInstitution(code);
            if (!result) {
              setError("Code agence invalide. Vérifiez auprès de votre directeur.");
              return;
            }
            goTo("MANAGER_SUCCESS", {
              joinCode: code,
              mgCode: result.mgCode,
              teamId: result.teamId,
            });
          }}
        />
      )}

      {state.currentStep === "MANAGER_SUCCESS" && (
        <ManagerSuccessStep
          mgCode={state.mgCode ?? ""}
          onFinish={() => finish("MANAGER")}
        />
      )}

      {/* ── Flow C: Agent (Conseiller) ── */}
      {state.currentStep === "AGENT_JOIN" && (
        <AgentJoinStep
          initialCode={state.joinCode ?? ""}
          error={error}
          onBack={() => goTo("PROFILE_TYPE", { profileType: null })}
          onJoinTeam={(code) => {
            const ok = joinTeam(code);
            if (!ok) {
              setError("Code équipe invalide. Vérifiez auprès de votre manager.");
              return;
            }
            goTo("AGENT_SUCCESS", { joinCode: code });
          }}
          onSolo={() => {
            createPersonalTeam();
            finish("AGENT");
          }}
        />
      )}

      {state.currentStep === "AGENT_SUCCESS" && (
        <AgentSuccessStep onFinish={() => finish("AGENT")} />
      )}

      {state.currentStep === "COACH_DONE" && (
        <CoachDoneStep onFinish={() => finish("COACH")} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/* Sub-step components                                                 */
/* ════════════════════════════════════════════════════════════════════ */

function ProfileTypeStep({ onSelect }: { onSelect: (p: ProfileType) => void }) {
  const profiles: { type: ProfileType; icon: React.ReactNode; title: string; desc: string }[] = [
    {
      type: "INSTITUTION",
      icon: <Building2 className="h-6 w-6 text-primary" />,
      title: "Je crée une agence",
      desc: "Créez votre agence et invitez vos managers",
    },
    {
      type: "MANAGER",
      icon: <Users className="h-6 w-6 text-primary" />,
      title: "Je suis Manager",
      desc: "Rejoignez une agence existante ou créez la vôtre",
    },
    {
      type: "AGENT",
      icon: <UserCheck className="h-6 w-6 text-primary" />,
      title: "Je suis Conseiller",
      desc: "Rejoignez l'équipe de votre manager",
    },
    {
      type: "COACH",
      icon: <GraduationCap className="h-6 w-6 text-primary" />,
      title: "Je suis Coach",
      desc: "Accompagnez vos clients en externe",
    },
  ];

  return (
    <>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Qui êtes-vous ?
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Choisissez votre profil pour personnaliser votre expérience
      </p>
      <div className="space-y-3">
        {profiles.map((p) => (
          <button
            key={p.type}
            onClick={() => onSelect(p.type)}
            className="flex w-full items-center gap-4 rounded-xl border border-input bg-background p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {p.icon}
            </div>
            <div>
              <p className="font-semibold text-foreground">{p.title}</p>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

/* ── Institution Flow ── */

function InstitutionNameStep({
  initialName,
  onBack,
  onNext,
}: {
  initialName: string;
  onBack: () => void;
  onNext: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);

  return (
    <>
      <BackButton onClick={onBack} />
      <h1 className="mb-2 text-center text-xl font-bold text-foreground">
        Créer votre agence
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Quel est le nom de votre agence immobilière ?
      </p>
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Start Academy, Mon Agence..."
          autoFocus
          className="h-11 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          onClick={() => onNext(name.trim())}
          disabled={!name.trim()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Continuer
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function InstitutionConfirmStep({
  institutionName,
  userName,
  onBack,
  onConfirm,
}: {
  institutionName: string;
  userName: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <BackButton onClick={onBack} />
      <h1 className="mb-2 text-center text-xl font-bold text-foreground">
        Confirmation
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Vérifiez les informations avant de créer votre agence
      </p>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="mb-3">
            <p className="text-xs text-muted-foreground">Agence</p>
            <p className="font-semibold text-foreground">{institutionName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Manager principal</p>
            <p className="font-semibold text-foreground">{userName}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Vous serez le manager principal de cette agence. Un code d&apos;invitation
          sera généré pour inviter d&apos;autres managers.
        </p>
        <button
          onClick={onConfirm}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <CheckCircle2 className="h-4 w-4" />
          Créer l&apos;agence
        </button>
      </div>
    </>
  );
}

function InstitutionSuccessStep({
  agCode,
  mgCode,
  institutionName,
  onFinish,
}: {
  agCode: string;
  mgCode: string;
  institutionName: string;
  onFinish: () => void;
}) {
  return (
    <>
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
      </div>
      <h1 className="mb-2 text-center text-xl font-bold text-foreground">
        {institutionName} est créée !
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Partagez ces codes pour construire votre équipe
      </p>
      <div className="space-y-4">
        <InviteSharePanel
          code={agCode}
          label="Code Agence"
          description="Pour inviter des managers à rejoindre votre agence"
        />
        <InviteSharePanel
          code={mgCode}
          label="Code Équipe"
          description="Pour inviter des conseillers dans votre équipe"
        />
        <button
          onClick={onFinish}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Accéder au tableau de bord
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

/* ── Manager Flow ── */

function ManagerJoinStep({
  initialCode,
  error,
  onBack,
  onCreateInstead,
  onJoin,
}: {
  initialCode: string;
  error: string;
  onBack: () => void;
  onCreateInstead: () => void;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState(initialCode);

  return (
    <>
      <BackButton onClick={onBack} />
      <h1 className="mb-2 text-center text-xl font-bold text-foreground">
        Rejoindre une agence
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Entrez le code agence fourni par votre directeur
      </p>
      <div className="space-y-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="AG-XXXX"
          autoFocus
          className="h-11 w-full rounded-lg border border-input bg-background px-4 text-center text-lg font-bold tracking-wider text-foreground outline-none focus:ring-2 focus:ring-primary/50"
        />
        {error && (
          <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <button
          onClick={() => onJoin(code.trim())}
          disabled={!code.trim()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Rejoindre
          <ArrowRight className="h-4 w-4" />
        </button>
        <div className="border-t border-border pt-4">
          <button
            onClick={onCreateInstead}
            className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Pas de code ? Créer ma propre agence
          </button>
        </div>
      </div>
    </>
  );
}

function ManagerSuccessStep({
  mgCode,
  onFinish,
}: {
  mgCode: string;
  onFinish: () => void;
}) {
  return (
    <>
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
      </div>
      <h1 className="mb-2 text-center text-xl font-bold text-foreground">
        Vous avez rejoint l&apos;agence !
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Votre équipe est prête. Partagez ce code avec vos conseillers.
      </p>
      <div className="space-y-4">
        <InviteSharePanel
          code={mgCode}
          label="Code Équipe"
          description="Pour inviter des conseillers dans votre équipe"
        />
        <button
          onClick={onFinish}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Accéder au tableau de bord
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

/* ── Agent Flow ── */

function AgentJoinStep({
  initialCode,
  error,
  onBack,
  onJoinTeam,
  onSolo,
}: {
  initialCode: string;
  error: string;
  onBack: () => void;
  onJoinTeam: (code: string) => void;
  onSolo: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [hasTeam, setHasTeam] = useState<boolean | null>(initialCode ? true : null);

  if (hasTeam === null) {
    return (
      <>
        <BackButton onClick={onBack} />
        <h1 className="mb-2 text-center text-xl font-bold text-foreground">
          Rejoindre une équipe
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Avez-vous un code d&apos;équipe de votre manager ?
        </p>
        <div className="space-y-3">
          <button
            onClick={() => setHasTeam(true)}
            className="flex w-full items-center gap-4 rounded-xl border border-input bg-background p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Oui, j&apos;ai un code</p>
              <p className="text-sm text-muted-foreground">
                Mon manager m&apos;a donné un code MG-XXXX
              </p>
            </div>
          </button>
          <button
            onClick={onSolo}
            className="flex w-full items-center gap-4 rounded-xl border border-input bg-background p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Non, je suis indépendant</p>
              <p className="text-sm text-muted-foreground">
                Je travaille seul pour le moment
              </p>
            </div>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <BackButton onClick={() => setHasTeam(null)} />
      <h1 className="mb-2 text-center text-xl font-bold text-foreground">
        Code équipe
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Entrez le code fourni par votre manager
      </p>
      <div className="space-y-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="MG-XXXX"
          autoFocus
          className="h-11 w-full rounded-lg border border-input bg-background px-4 text-center text-lg font-bold tracking-wider text-foreground outline-none focus:ring-2 focus:ring-primary/50"
        />
        {error && (
          <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <button
          onClick={() => onJoinTeam(code.trim())}
          disabled={!code.trim()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Rejoindre l&apos;équipe
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function AgentSuccessStep({ onFinish }: { onFinish: () => void }) {
  return (
    <>
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
      </div>
      <h1 className="mb-2 text-center text-xl font-bold text-foreground">
        Bienvenue dans l&apos;équipe !
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Vous êtes maintenant rattaché à votre manager. Commencez à suivre vos performances.
      </p>
      <button
        onClick={onFinish}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Accéder au tableau de bord
        <ArrowRight className="h-4 w-4" />
      </button>
    </>
  );
}

/* ── Coach Flow ── */

function CoachDoneStep({ onFinish }: { onFinish: () => void }) {
  return (
    <>
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
      </div>
      <h1 className="mb-2 text-center text-xl font-bold text-foreground">
        Bienvenue, Coach !
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Votre espace est prêt. Accompagnez vos clients vers la performance.
      </p>
      <button
        onClick={onFinish}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Accéder au tableau de bord
        <ArrowRight className="h-4 w-4" />
      </button>
    </>
  );
}

/* ── Shared ── */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Retour
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingFlow />
    </Suspense>
  );
}
