import { NextRequest, NextResponse } from "next/server";

// Vérification serveur du code d'accès démo. Le code attendu vit uniquement
// dans la variable d'environnement serveur DEMO_ACCESS_CODE — il n'apparaît
// jamais dans le bundle client. Aucun log du code soumis.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const expected = process.env.DEMO_ACCESS_CODE;
  if (!expected || !expected.trim()) {
    return NextResponse.json(
      { error: "Code démo non configuré" },
      { status: 503 },
    );
  }

  let submitted = "";
  try {
    const body = await request.json();
    submitted = typeof body?.code === "string" ? body.code : "";
  } catch {
    submitted = "";
  }

  if (submitted.trim().toUpperCase() !== expected.trim().toUpperCase()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
