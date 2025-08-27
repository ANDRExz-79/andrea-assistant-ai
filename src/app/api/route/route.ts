// app/api/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Tipe untuk percakapan
type Message = {
  role: "user" | "assistant";
  content: string;
};

// Simpan memory percakapan sementara (per sesi server, hilang setelah refresh / restart)
let conversations: Message[] = [];

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemInstruction = `
      Kamu adalah AI asisten yang menjawab dengan gaya interaktif 🎉.
      Saat awal judul selalu gunakan emoji sesuai konteks (uang 💵, bendera 🇮🇩, teknologi 💻, kesehatan 🩺, olahraga ⚽, dll).
      Buat jawaban ramah, menarik, dan mudah dipahami, tapi saat isi nya tidak perlu emoji hanya judul besar dan judul kecil nya.
    `;

    let text = "";

    // === CASE 1: Request dengan gambar ===
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const prompt = form.get("prompt")?.toString() || "Deskripsikan gambar ini.";
      const file = form.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "File gambar tidak ditemukan." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");

      // Tambahkan pertanyaan user ke memory
      conversations.push({ role: "user", content: prompt });

      const result = await model.generateContent([
        { text: systemInstruction },
        ...conversations.map((msg) => ({ text: `${msg.role}: ${msg.content}` })),
        {
          inlineData: {
            mimeType: file.type,
            data: base64,
          },
        },
      ]);

      try {
        text = result.response.text();
      } catch {
        text = "⚠ Tidak ada jawaban dari gambar.";
      }

      // Simpan jawaban AI ke memory
      conversations.push({ role: "assistant", content: text });
    }

    // === CASE 2: Request JSON biasa (teks saja) ===
    else {
      const body = (await req.json()) as { prompt?: string };
      const prompt = body.prompt;

      if (!prompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
      }

      // Tambahkan pertanyaan user ke memory
      conversations.push({ role: "user", content: prompt });

      const result = await model.generateContent([
        { text: systemInstruction },
        ...conversations.map((msg) => ({ text: `${msg.role}: ${msg.content}` })),
      ]);

      try {
        text = result.response.text();
      } catch {
        text = "⚠ Maaf, AI tidak memberikan jawaban.";
      }

      // Simpan jawaban AI ke memory
      conversations.push({ role: "assistant", content: text });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Tambahan endpoint DELETE untuk reset memory (new chat)
export async function DELETE() {
  conversations = [];
  return NextResponse.json({ message: "Memory direset, siap untuk obrolan baru 🚀" });
}