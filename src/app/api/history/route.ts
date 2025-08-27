import { NextResponse } from "next/server";

let histories: any[] = [];

export async function GET() {
  return NextResponse.json({ histories });
}

export async function POST(req: Request) {
  const body = await req.json();
  histories.push(body);
  return NextResponse.json({ success: true, histories });
}

export async function DELETE() {
  histories = [];
  return NextResponse.json({ success: true });
}