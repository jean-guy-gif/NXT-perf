import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

serve(async (req) => {
  try {
    const payload = await req.json();
    const { email, raw_user_meta_data } = payload.record || payload;

    const firstName = raw_user_meta_data?.first_name || "Utilisateur";
    const role = raw_user_meta_data?.main_role || raw_user_meta_data?.role || "conseiller";

    const html = generateEmailHTML(firstName, role);
    const subject = `Bienvenue sur NXT Performance, ${firstName} !`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NXT Performance <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function generateEmailHTML(firstName: string, role: string): string {
  const roleContent: Record<string, { title: string; benefits: string[]; cta: string }> = {
    conseiller: {
      title: "Votre cockpit de performance est prêt",
      benefits: [
        "Suivez vos <strong>7 ratios clés</strong> en temps réel : contacts → RDV, estimations → mandats, visites → offres, offres → compromis",
        "Identifiez <strong>instantanément</strong> vos axes de progression grâce au diagnostic automatique",
        "Entraînez-vous avec des <strong>plans d'action sur 30 jours</strong> adaptés à vos faiblesses",
        "Comparez vos résultats aux <strong>moyennes du marché</strong> et visez le statut Top Performer",
        "Visualisez votre <strong>GPS commercial</strong> : combien d'estimations, de mandats, de visites vous devez réaliser pour atteindre votre objectif de CA",
      ],
      cta: "Commencez par saisir votre activité du mois pour activer vos indicateurs.",
    },
    manager: {
      title: "Votre outil de pilotage d'équipe est prêt",
      benefits: [
        "Pilotez votre équipe avec un <strong>cockpit en temps réel</strong> : KPI collectifs, alertes de performance, suivi des contacts",
        "Détectez <strong>immédiatement</strong> les conseillers en difficulté grâce aux alertes prioritaires et au scoring automatique",
        "Ciblez vos coachings avec le <strong>GPS Équipe</strong> : identifiez quel ratio travailler en priorité avec chaque conseiller",
        "Générez des <strong>plans de formation collective</strong> basés sur les faiblesses réelles de votre équipe",
        "Comparez les performances individuelles au <strong>benchmark marché</strong> pour objectiver vos entretiens",
      ],
      cta: "Invitez vos conseillers avec votre code d'équipe pour commencer le pilotage.",
    },
    directeur: {
      title: "Votre cockpit de direction est prêt",
      benefits: [
        "Pilotez votre agence avec un <strong>GPS financier</strong> : objectif CA, réalisé, écart, projection annuelle",
        "Comparez les <strong>performances de vos équipes</strong> en un coup d'œil et identifiez les leviers de croissance",
        "Vérifiez l'<strong>alignement des objectifs</strong> entre vos agents, vos managers et votre ambition agence",
        "Recevez des <strong>alertes proactives</strong> : conseillers en difficulté, ratios critiques, équipes sous-performantes",
        "Accédez au <strong>pilotage financier</strong> : commissions, charges, seuil de rentabilité et projections",
      ],
      cta: "Définissez votre objectif CA agence dans le GPS Directeur pour activer le pilotage.",
    },
    coach: {
      title: "Votre espace de coaching est prêt",
      benefits: [
        "Accompagnez vos clients avec un <strong>diagnostic objectif</strong> basé sur les 7 ratios de performance",
        "Créez des <strong>plans d'action structurés</strong> sur 30 jours avec actions, fréquences et indicateurs de suivi",
        "Suivez la <strong>progression mesurable</strong> de chaque client : scoring, tendances, alertes",
        "Priorisez vos interventions grâce aux <strong>alertes automatiques</strong> sur les clients en difficulté",
        "Gérez votre portefeuille avec une vue consolidée : <strong>agences, managers et agents</strong> dans un seul tableau de bord",
      ],
      cta: "Consultez votre portefeuille clients pour commencer l'accompagnement.",
    },
    reseau: {
      title: "Votre tableau de bord réseau est prêt",
      benefits: [
        "Consolidez la <strong>performance de toutes vos agences</strong> dans un seul dashboard",
        "Comparez les résultats : <strong>CA, mandats, exclusivité, offres et score global</strong> par agence",
        "Détectez les <strong>agences à accompagner</strong> en priorité grâce aux alertes automatiques",
        "Identifiez vos <strong>top performers</strong> et partagez les bonnes pratiques",
        "Pilotez le réseau avec des <strong>indicateurs consolidés</strong> et des tendances mois par mois",
      ],
      cta: "Consultez votre tableau de bord réseau pour voir la performance consolidée.",
    },
  };

  const content = roleContent[role] || roleContent.conseiller;

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <div style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#3375FF,#A055FF);border-radius:12px;padding:12px 24px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:1px;">NXT Performance</span>
        </div>
      </div>

      <h1 style="color:#1a1a2e;font-size:24px;font-weight:700;margin:0 0 8px;">
        Bonjour ${firstName},
      </h1>

      <h2 style="color:#3375FF;font-size:18px;font-weight:600;margin:0 0 24px;">
        ${content.title}
      </h2>

      <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 24px;">
        NXT Performance n'est pas un simple dashboard de chiffres. C'est un <strong>écosystème complet conçu pour mesurer, comprendre et booster votre performance commerciale</strong> en immobilier.
      </p>

      <h3 style="color:#1a1a2e;font-size:16px;font-weight:600;margin:0 0 16px;">
        Ce que NXT Performance vous apporte :
      </h3>

      <div style="margin:0 0 24px;">
        ${content.benefits.map(b => `
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
            <div style="min-width:24px;height:24px;background:#3375FF;border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:14px;">✓</span>
            </div>
            <p style="color:#444;font-size:14px;line-height:1.5;margin:0;">${b}</p>
          </div>
        `).join("")}
      </div>

      <div style="background:#f0f4ff;border-left:4px solid #3375FF;border-radius:0 8px 8px 0;padding:16px;margin:0 0 32px;">
        <p style="color:#1a1a2e;font-size:14px;font-weight:600;margin:0;">
          → ${content.cta}
        </p>
      </div>

      <div style="text-align:center;margin:0 0 32px;">
        <a href="https://nxt-performance.vercel.app/login" style="display:inline-block;background:linear-gradient(135deg,#3375FF,#A055FF);color:#ffffff;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;text-decoration:none;">
          Accéder à mon dashboard
        </a>
      </div>

      <div style="border-top:1px solid #eee;padding-top:24px;">
        <p style="color:#888;font-size:13px;line-height:1.5;margin:0;">
          NXT Performance transforme vos données terrain en décisions actionnables.<br>
          Chaque chiffre a une signification. Chaque ratio vous guide vers la prochaine action.<br><br>
          À très vite sur votre dashboard,<br>
          <strong>L'équipe NXT Performance</strong>
        </p>
      </div>

    </div>

    <p style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;">
      © 2026 NXT Performance — Outil de pilotage commercial immobilier
    </p>

  </div>
</body>
</html>`;
}
