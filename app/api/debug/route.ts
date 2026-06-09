import { NextResponse } from "next/server";
import * as fs from "fs";

export async function POST(req: Request) {
  const data = await req.json();
  fs.writeFileSync("scratch/debug_items.json", JSON.stringify(data, null, 2));
  return NextResponse.json({ ok: true });
}
