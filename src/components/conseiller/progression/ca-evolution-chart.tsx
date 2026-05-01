"use client";

import { useMemo } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import { LineChart } from "@/components/charts/line-chart";
import { useUser } from "@/hooks/use-user";
import { useAllResults } from "@/hooks/use-results";

const MOCK_MARKET_AVERAGE_PER_MONTH = 14000;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

export function CaEvolutionChart() {
  const { user } = useUser();
  const allResults = useAllResults();

  const data = useMemo(() => {
    if (!user) return [];

    // 12 derniers mois — base mensuelle
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: monthLabel(d) });
    }

    // Index ma série par mois
    const myByMonth = new Map<string, number>();
    for (const r of allResults) {
      if (r.userId !== user.id || r.periodType !== "month") continue;
      const k = r.periodStart.substring(0, 7);
      const ca = r.ventes?.chiffreAffaires ?? 0;
      myByMonth.set(k, (myByMonth.get(k) ?? 0) + ca);
    }

    return months.map((m) => ({
      mois: m.label,
      moi: myByMonth.get(m.key) ?? 0,
      marche: MOCK_MARKET_AVERAGE_PER_MONTH,
    }));
  }, [user, allResults]);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <LineChartIcon className="h-3.5 w-3.5" />
        Évolution CA — 12 mois
      </div>
      <h3 className="mt-2 text-lg font-bold text-foreground">
        Mon évolution CA vs marché
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Comparatif mensuel : votre CA acte vs moyenne marché (référence
        provisoire — calibration en cours).
      </p>

      <div className="mt-4">
        <LineChart
          data={data}
          xKey="mois"
          lines={[
            { dataKey: "moi", color: "#3375FF", name: "Mon CA" },
            {
              dataKey: "marche",
              color: "#94A3B8",
              name: "Moyenne marché",
            },
          ]}
          height={260}
          showGrid
        />
      </div>
    </section>
  );
}
