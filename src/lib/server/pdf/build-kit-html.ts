/**
 * Construit le HTML d'export PDF d'un Kit (PR3.8 follow-up — export PDF natif).
 *
 * SERVEUR UNIQUEMENT — utilisé par `/api/export-plan-pdf` qui passe le HTML
 * à Puppeteer pour rendre un PDF A4 portrait. Aucune dépendance externe :
 * tout le styling est inline pour éviter les requêtes réseau pendant le
 * rendu (puppeteer attend `networkidle0`).
 *
 * Layout :
 *   - Page 1 : page de garde (kit.title + kit.subtitle, centrée)
 *   - Pages suivantes : 1 page par section (heading + paragraphe + bullets)
 *   - Page break forcé entre chaque section via `page-break-before: always`
 */

import type { Kit } from "@/lib/coaching/team-activation-kit";

/**
 * Échappe les caractères HTML dangereux. Le contenu Kit vient de `coach-brain`
 * (hardcoded) ou de `coaching_patterns` (anonymisé serveur). Pas d'input
 * utilisateur direct ici, mais l'échappement reste obligatoire en défense.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLES = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    page-break-after: always;
    padding: 56px 64px;
    min-height: calc(297mm - 0px);
  }
  .page:last-child { page-break-after: auto; }

  .page--cover {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    background: #f8fafc;
  }
  .page--cover h1 {
    font-size: 40pt;
    font-weight: 800;
    line-height: 1.15;
    margin: 0 0 24px 0;
    color: #0f172a;
    max-width: 540px;
  }
  .page--cover .subtitle {
    font-size: 14pt;
    color: #475569;
    max-width: 480px;
    line-height: 1.5;
  }
  .page--cover .brand {
    position: fixed;
    bottom: 32px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 9pt;
    color: #94a3b8;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .page--section h2 {
    font-size: 22pt;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px 0;
    padding-bottom: 12px;
    border-bottom: 2px solid #3b82f6;
  }
  .page--section .lever {
    font-size: 10pt;
    color: #64748b;
    margin: 0 0 32px 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .page--section .paragraph {
    font-size: 13pt;
    line-height: 1.65;
    color: #1e293b;
    margin: 0 0 24px 0;
    background: #f1f5f9;
    border-left: 4px solid #3b82f6;
    padding: 16px 20px;
    border-radius: 4px;
  }
  .page--section ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .page--section li {
    font-size: 13pt;
    line-height: 1.6;
    color: #1e293b;
    margin: 0 0 16px 0;
    padding-left: 28px;
    position: relative;
  }
  .page--section li:before {
    content: "";
    position: absolute;
    left: 0;
    top: 9px;
    width: 10px;
    height: 10px;
    background: #3b82f6;
    border-radius: 50%;
  }

  .page--section .footer {
    position: fixed;
    bottom: 24px;
    left: 64px;
    right: 64px;
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
  }
`;

interface BuildHtmlOptions {
  /** Tag affiché en page de garde (ex. "Plan d'action manager"). */
  brandTag?: string;
}

export function buildKitHtml(kit: Kit, opts: BuildHtmlOptions = {}): string {
  const brandTag = opts.brandTag ?? "NXT Performance — Plan d'action manager";
  const sections = kit.sections.map((section, i) => {
    const lines: string[] = [];
    lines.push(`<div class="page page--section">`);
    lines.push(`<p class="lever">Section ${i + 1} / ${kit.sections.length} — ${escapeHtml(kit.title)}</p>`);
    lines.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    if (section.paragraph) {
      lines.push(`<p class="paragraph">${escapeHtml(section.paragraph)}</p>`);
    }
    if (section.bullets && section.bullets.length > 0) {
      lines.push(`<ul>`);
      for (const b of section.bullets) {
        lines.push(`<li>${escapeHtml(b)}</li>`);
      }
      lines.push(`</ul>`);
    }
    lines.push(
      `<div class="footer"><span>${escapeHtml(brandTag)}</span><span>${i + 1} / ${kit.sections.length}</span></div>`,
    );
    lines.push(`</div>`);
    return lines.join("\n");
  });

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(kit.title)}</title>
<style>${STYLES}</style>
</head>
<body>
  <div class="page page--cover">
    <h1>${escapeHtml(kit.title)}</h1>
    ${kit.subtitle ? `<p class="subtitle">${escapeHtml(kit.subtitle)}</p>` : ""}
    <div class="brand">${escapeHtml(brandTag)}</div>
  </div>
  ${sections.join("\n")}
</body>
</html>`;
}
