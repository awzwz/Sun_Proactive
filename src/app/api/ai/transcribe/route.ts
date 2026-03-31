import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB — Whisper API limit

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    if (audio.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 25 MB)" },
        { status: 400 }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audio,
      language: "ru",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
