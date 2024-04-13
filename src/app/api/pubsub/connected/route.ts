import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const hub = url.searchParams.get("event");
  console.log("/api/pubsub/connected hub", hub);
  const secret = url.searchParams.get("secret");
  console.log("/api/pubsub/connected secret", secret);
  const body = await req.json();
  console.log("/api/pubsub/connected body", JSON.stringify(body, null, 4));
  return NextResponse.json({});
}