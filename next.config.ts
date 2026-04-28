import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      { source: "/directeur/formation-collective", destination: "/directeur/formation", permanent: true },
      { source: "/admin/dpi", destination: "/directeur/leads-dpi", permanent: true },
    ];
  },
};

export default nextConfig;
