import { NextResponse } from "next/server";
import { COINS, searchCoins } from "@/lib/coins";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const coins = q ? searchCoins(q) : COINS;
  return NextResponse.json({ coins });
}
