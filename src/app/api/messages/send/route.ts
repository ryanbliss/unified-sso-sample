import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
    const json = await req.json();
    console.log("/api/messages/route.ts body:", json);
    return NextResponse.json({});
}
