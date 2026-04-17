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
  "estimations_mandats",
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
