import { NextResponse } from "next/server";

export async function GET() {
  try {
    const prompt = `
      Tulis 5 berita terbaru hari ini secara realtime dan topik hangat.
      Sertakan sumber singkat di akhir (misalnya: Sumber: Tribun, Kompas, CNN, TV) serta berita tersebut untuk negara apa.
    `;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada berita.";

    return NextResponse.json({ result: text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}