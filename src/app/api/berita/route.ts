import { NextResponse } from "next/server";

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

export async function GET() {
  try {
    const prompt = `
      Tulis 5 berita terbaru hari ini secara realtime dan topik hangat.
      Sertakan sumber singkat di akhir (misalnya: Sumber: Tribun, Kompas, CNN, TV) serta berita tersebut untuk negara apa.
    `;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Gagal mengambil berita dari Gemini API" },
        { status: res.status }
      );
    }

    const data: GeminiResponse = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada berita.";

    return NextResponse.json({ result: text });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}