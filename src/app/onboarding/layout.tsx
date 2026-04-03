import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NXT Performance — Onboarding",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="flex items-center justify-center border-b border-border/50 bg-card/30 px-6 py-3 backdrop-blur-sm">
        <span className="text-sm font-bold tracking-tight text-foreground">
          NXT Performance
        </span>
      </header>
      <main>{children}</main>
    </div>
  );
}
