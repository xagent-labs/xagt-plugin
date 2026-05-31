import { NextResponse } from "next/server";
import { chainData } from "@/lib/data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chains = searchParams.get("chains")?.split(",").map(Number).filter(Boolean) ?? [
    1, 42161, 8453,
  ];

  const snapshots = await chainData.getGasSnapshots(chains);
  return NextResponse.json({ snapshots, updatedAt: new Date().toISOString() });
}
