import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Identifiants legacy supprimés par la refonte KPI conseiller v2.
// Toute réintroduction (type, champ, ratio) doit échouer le lint.
// Voir docs/TECH_DEBT.md et src/types/results.ts pour le contexte.
const LEGACY_KPI_IDENTIFIERS = [
  "VenteInfo",
  "AcheteurChaud",
  "ContactStatut",
  "contactsEntrants",
  "informationsVente",
  "acheteursChauds",
  "acheteursChaudsCount",
  "delaiMoyenVente",
  // NB : `estimations_mandats` n'est PAS legacy — c'est l'ExpertiseRatioId
  // courant (axe estimations → mandats, cf. src/data/ratio-expertise.ts).
  // Il a été retiré de la garde (il était un faux positif).
  "mandats_simples_vente",
  "mandats_exclusifs_vente",
  // Refonte saisie : on ne saisit plus de noms de mandats, juste des compteurs.
  "MandatDetail",
  "mandatsDetail",
  "detail_mandats",
  "parseMandatsText",
  // Refonte saisie v3 : occurrences typées sans nom ni état "profilé".
  // (mandatsSimples/mandatsExclusifs restent autorisés comme noms de variables
  //  locales — uniquement le nom interdit est `nomVendeur`.)
  "nomVendeur",
];

const LEGACY_GUARD_MESSAGE =
  "Identifiant supprimé par la refonte KPI v2 — ne pas réintroduire (voir src/types/results.ts).";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/types/results.ts", // contient le commentaire-garde listant les noms interdits
      "eslint.config.mjs",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...LEGACY_KPI_IDENTIFIERS.flatMap((name) => [
          {
            selector: `Identifier[name='${name}']`,
            message: LEGACY_GUARD_MESSAGE,
          },
          {
            selector: `Literal[value='${name}']`,
            message: LEGACY_GUARD_MESSAGE,
          },
        ]),
      ],

      // Règles du React Compiler (eslint-plugin-react-hooks v6) : ce socle a
      // été écrit avant le compilateur React. Ces diagnostics sont des pistes
      // de migration (aucun impact à l'exécution hors build compilateur) — on
      // les garde en "warn" pour ne pas bloquer le lint, à traiter plus tard.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/rules-of-hooks": "warn",
      // Apostrophes dans le texte JSX — purement cosmétique.
      "react/no-unescaped-entities": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
