import { prepareBotPromptFiles } from "@/bot/fs-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  prepareBotPromptFiles();
  return NextResponse.json({});
}
