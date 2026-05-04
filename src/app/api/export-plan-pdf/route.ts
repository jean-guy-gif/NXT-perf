import { NextResponse } from "next/server";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import { buildKit, type KitKind } from "@/lib/coaching/team-activation-kit";
import { buildKitHtml } from "@/lib/server/pdf/build-kit-html";

/**
 * /api/export-plan-pdf
 *
 * Génère un PDF natif du plan collectif (kit Réunion / Pratique / Hebdo)
 * sans dépendance Gamma. Pipeline :
 *   1. valider kitKind + expertiseId (mêmes garde-fous que la route Gamma)
 *   2. reconstruire le Kit côté serveur via `buildKit`
 *   3. générer le HTML (slide-style, page-break par section)
 *   4. lancer Puppeteer + Chromium serverless (@sparticuz/chromium en prod,
 *      PUPPETEER_EXECUTABLE_PATH en local dev — cf. README à venir)
 *   5. renvoyer le PDF en `application/pdf` avec Content-Disposition
 *
 * Scope serveur uniquement — Puppeteer ne touche jamais le bundle client.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RequestBody {
  kitKind: KitKind;
  expertiseId: string;
}

function isKitKind(v: unknown): v is KitKind {
  return v === "meeting" || v === "practice" || v === "weekly";
}

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "plan"
  );
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isKitKind(body.kitKind)) {
    return NextResponse.json({ error: "Invalid kitKind" }, { status: 400 });
  }
  if (
    typeof body.expertiseId !== "string" ||
    !(body.expertiseId in RATIO_EXPERTISE)
  ) {
    return NextResponse.json({ error: "Invalid expertiseId" }, { status: 400 });
  }

  console.info("[PDF API] request received", {
    kitKind: body.kitKind,
    expertiseId: body.expertiseId,
  });

  const kit = buildKit(body.kitKind, body.expertiseId as ExpertiseRatioId);
  const html = buildKitHtml(kit);

  // Imports différés — gardent les modules Puppeteer hors du bundle si la
  // route n'est jamais appelée + permettent de masquer les erreurs d'env
  // local plus proprement (on ne crash pas à l'import).
  let browser: import("puppeteer-core").Browser | null = null;
  try {
    const puppeteer = (await import("puppeteer-core")).default;

    // En prod (Vercel) : @sparticuz/chromium fournit le binaire Chromium
    // serverless-friendly. En dev local : on attend
    // PUPPETEER_EXECUTABLE_PATH (chemin du Chrome système) sinon on bascule
    // sur chromium aussi, ce qui peut échouer hors Linux.
    let executablePath: string;
    let args: string[];
    let headless: boolean | "shell" = true;
    let defaultViewport: import("puppeteer-core").Viewport | null = {
      width: 1240,
      height: 1754, // ratio A4 portrait à 150 DPI
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      args = ["--no-sandbox", "--disable-setuid-sandbox"];
    } else {
      const chromium = (await import("@sparticuz/chromium")).default;
      executablePath = await chromium.executablePath();
      args = chromium.args;
      headless = chromium.headless;
      defaultViewport = chromium.defaultViewport ?? defaultViewport;
    }

    console.info("[PDF API] chromium executable", {
      executablePath,
      headless,
      argsCount: args.length,
    });

    browser = await puppeteer.launch({
      args,
      executablePath,
      headless,
      defaultViewport,
    });

    console.info("[PDF API] browser launched, rendering HTML…");

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    console.info("[PDF API] PDF generated", {
      bytes: pdfBuffer.byteLength ?? pdfBuffer.length,
    });

    const filename = `${slugify(kit.title)}.pdf`;

    // `page.pdf()` retourne `Uint8Array` ; on enveloppe explicitement dans
    // un Buffer compatible BodyInit pour `Response`.
    const body = new Uint8Array(pdfBuffer);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const e = err as Error;
    console.error("[PDF API] error", {
      kitKind: body.kitKind,
      expertiseId: body.expertiseId,
      message: e.message,
      stack: e.stack?.split("\n").slice(0, 5).join(" | "),
    });
    return NextResponse.json(
      {
        error: "PDF generation failed",
        upstream: e.message?.slice(0, 240),
      },
      { status: 500 },
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}
