import { NextResponse } from "next/server";

interface HistoryItem {
  id: string;
  prompt: string;
  response: string;
  timestamp: string;
}

let histories: HistoryItem[] = [];

// GET -> ambil semua history
export async function GET() {
  return NextResponse.json({ histories });
}

// POST -> tambah 1 history baru
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.prompt || !body.response) {
      return NextResponse.json(
        { error: "prompt dan response wajib diisi" },
        { status: 400 }
      );
    }

    const newHistory: HistoryItem = {
      id: Date.now().toString(),
      prompt: body.prompt,
      response: body.response,
      timestamp: new Date().toISOString(),
    };

    histories.push(newHistory);

    return NextResponse.json({ success: true, histories });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE -> hapus semua history
export async function DELETE() {
  histories = [];
  return NextResponse.json({ success: true });
}