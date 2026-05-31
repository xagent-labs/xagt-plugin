import { NextResponse } from "next/server";
import { getMcpToolCatalog } from "@skills/mcp/adapter";

export async function GET() {
  const tools = getMcpToolCatalog();
  return NextResponse.json({ tools, protocol: "mcp-tools-v1" });
}
