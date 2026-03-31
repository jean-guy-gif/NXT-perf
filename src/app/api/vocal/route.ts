import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSystemPrompt, type VocalSection, SECTION_ORDER } from "@/lib/vocal-prompts";

export async function POST(req: NextRequest) {
  // Instanciation dans le handler pour éviter le crash au build (clés absentes)
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || "",
    baseURL: "https://api.groq.com/openai/v1",
  });

  const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseURL: "https://openrouter.ai/api/v1",
  });
  try {
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as Blob | null;
    const section = formData.get("section") as VocalSection | null;

    if (!audioBlob || !section || !SECTION_ORDER.includes(section)) {
      return NextResponse.json(
        { error: "Missing audio or invalid section" },
        { status: 400 }
      );
    }

    // ── Étape 1 : Transcription via Groq Whisper (gratuit) ──
    const audioFile = new File([audioBlob], "vocal.webm", {
      type: audioBlob.type || "audio/webm",
    });

    const transcription = await groq.audio.transcriptions.create({
      model: "whisper-large-v3",
      file: audioFile,
      language: "fr",
    });

    const transcript = transcription.text;

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "Transcription vide", transcript: "" },
        { status: 400 }
      );
    }

    // ── Étape 2 : Extraction structurée via Claude (OpenRouter) ──
    const systemPrompt = getSystemPrompt(section);

    const completion = await openrouter.chat.completions.create({
      model: "anthropic/claude-3.5-haiku",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Voici le bilan vocal de l'agent pour la section "${section}" :\n\n"${transcript}"`,
        },
      ],
      max_tokens: 1024,
    });

    const rawContent = completion.choices?.[0]?.message?.content ?? "";

    // Parser le JSON (gérer les cas où Claude ajoute du texte autour)
    let extracted;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        {
          error: "Erreur de parsing JSON",
          transcript,
          rawContent,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transcript,
      extracted,
      section,
    });
  } catch (error) {
    console.error("[vocal] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Erreur serveur", details: message },
      { status: 500 }
    );
  }
}
