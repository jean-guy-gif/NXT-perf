import type { DPIAxis } from "@/lib/dpi-axes";

export function initDemoDPISnapshot(userId: string) {
  const key = "nxt-dpi-snapshots";
  try {
    const existing = localStorage.getItem(key);
    const all = existing ? JSON.parse(existing) : {};

    const expectedIds = [
      "intensite_commerciale", "generation_opportunites", "solidite_portefeuille",
      "maitrise_ratios", "valorisation_economique", "pilotage_strategique",
    ];
    const snap = all[userId];
    if (snap) {
      const ids = (snap.axes ?? []).map((a: DPIAxis) => a.id);
      if (expectedIds.every((id) => ids.includes(id))) return;
    }

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);

    const axes: DPIAxis[] = [
      { id: "intensite_commerciale",   label: "Intensité Commerciale",     score: 50 },
      { id: "generation_opportunites", label: "Génération d'Opportunités", score: 55 },
      { id: "solidite_portefeuille",   label: "Solidité du Portefeuille",  score: 60 },
      { id: "maitrise_ratios",         label: "Maîtrise des Ratios",       score: 65 },
      { id: "valorisation_economique", label: "Valorisation Économique",   score: 45 },
      { id: "pilotage_strategique",    label: "Pilotage Stratégique",      score: 55 },
    ];

    all[userId] = {
      userId,
      date: lastMonth.toISOString(),
      globalScore: 55,
      axes,
    };
    localStorage.setItem(key, JSON.stringify(all));
  } catch {}
}
