import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import { buildKit, type KitKind } from "@/lib/coaching/team-activation-kit";
import { buildKitHtml } from "@/lib/server/pdf/build-kit-html";

/**
 * /api/export-plan-pdf
 *
 * Génère un PDF natif du plan collectif (kit Réunion / Pratique / Hebdo)
 * sans dépendance Gamma. Pipeline :
 *   1. Validation kitKind + expertiseId.
 *   2. Reconstitution du Kit côté serveur via `buildKit`.
 *   3. Génération HTML (slide-style, page-break par section).
 *   4. Lancement Puppeteer + Chromium serverless (`@sparticuz/chromium`).
 *   5. Réponse PDF en `application/pdf` avec `Content-Disposition`.
 *
 * Compat Vercel :
 *   - `package.json.engines.node = "20.x"` (Node 24 a des incompatibilités
 *     connues avec @sparticuz/chromium).
 *   - `next.config.ts.serverExternalPackages` exclut puppeteer-core et
 *     @sparticuz/chromium du bundle (sinon le tarball Chromium se casse).
 *   - args Chromium augmentés : `--no-sandbox` + `--disable-setuid-sandbox`
 *     + `--disable-dev-shm-usage` (robustesse Lambda environnement contraint).
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

  let browser: Browser | null = null;
  try {
    // En dev local : permet d'override par le Chrome système si la lib
    // @sparticuz/chromium ne tourne pas hors Linux (Mac/Windows).
    const localExec = process.env.PUPPETEER_EXECUTABLE_PATH;
    const launchOptions: Parameters<typeof puppeteer.launch>[0] = localExec
      ? {
          executablePath: localExec,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          headless: true,
        }
      : {
          args: [
            ...chromium.args,
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        };

    console.info("[PDF API] chromium executable", {
      executablePath: launchOptions.executablePath,
      headless: launchOptions.headless,
      argsCount: Array.isArray(launchOptions.args) ? launchOptions.args.length : 0,
    });

    browser = await puppeteer.launch(launchOptions);
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
    const responseBody = new Uint8Array(pdfBuffer);

    return new Response(responseBody, {
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
