import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PR3.8 — Export PDF natif (Puppeteer). Ces packages embarquent un
  // binaire Chromium et ne doivent PAS être bundlés par Next.js (sinon
  // les chemins du tarball Chromium se cassent au runtime Vercel et la
  // route /api/export-plan-pdf renvoie silencieusement 500). On les
  // marque externes pour qu'ils restent installés normalement dans
  // node_modules au runtime serverless.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "whxkxztcfkrjqkdenufn.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // PR1 — Refonte sidebar Directeur : URLs alignées sémantiquement sur la
  // sidebar Manager. Anciens liens externes/bookmarks redirigés en 301.
  async redirects() {
    return [
      { source: "/directeur/pilotage", destination: "/directeur/dashboard", permanent: true },
      { source: "/directeur/equipes", destination: "/directeur/resultats", permanent: true },
      { source: "/directeur/equipe", destination: "/directeur/dashboard", permanent: true },
      { source: "/directeur/formation-collective", destination: "/directeur/formation", permanent: true },
      { source: "/admin/dpi", destination: "/directeur/leads-dpi", permanent: true },
      // PR3 — Refonte Conseiller : ancienne arborescence racine → /conseiller/*
      { source: "/dashboard", destination: "/conseiller/diagnostic", permanent: true },
      { source: "/resultats", destination: "/conseiller/diagnostic", permanent: true },
      { source: "/performance", destination: "/conseiller/diagnostic", permanent: true },
      { source: "/comparaison", destination: "/conseiller/comparaison", permanent: true },
      { source: "/formation", destination: "/conseiller/ameliorer", permanent: true },
      { source: "/objectifs", destination: "/conseiller/progression", permanent: true },
      // PR3.8.1 — Refonte Manager : sidebar alignée sur Conseiller V3.
      // Anciennes URL principales redirigées vers les nouvelles. Les pages
      // /manager/dashboard, /manager/resultats, /manager/performance restent
      // dans le code (Plan30Jours et autres consommateurs y référencent
      // potentiellement) mais ne sont plus exposées par la nav.
      { source: "/manager/dashboard", destination: "/manager/diagnostic", permanent: true },
      { source: "/manager/resultats", destination: "/manager/progression", permanent: true },
      { source: "/manager/performance", destination: "/manager/diagnostic", permanent: true },
    ];
  },
};

export default nextConfig;
