export function initDemoDPISnapshot(userId: string) {
  const key = "nxt-dpi-snapshots";
  try {
    const existing = localStorage.getItem(key);
    const all = existing ? JSON.parse(existing) : {};
    if (all[userId]) return;

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);

    all[userId] = {
      userId,
      date: lastMonth.toISOString(),
      globalScore: 62,
      axes: [
        { axisId: "contacts_rdv", label: "Prospection", score: 55 },
        { axisId: "estimations_mandats", label: "Mandatement", score: 70 },
        { axisId: "pct_mandats_exclusifs", label: "Exclusivité", score: 45 },
        { axisId: "visites_offre", label: "Transformation", score: 60 },
        { axisId: "offres_compromis", label: "Concrétisation", score: 75 },
        { axisId: "mandats_simples_vente", label: "Vente simple", score: 65 },
        { axisId: "mandats_exclusifs_vente", label: "Vente exclu.", score: 60 },
      ],
    };
    localStorage.setItem(key, JSON.stringify(all));
  } catch {}
}
