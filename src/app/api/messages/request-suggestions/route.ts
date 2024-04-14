import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("/api/messages/request-suggestions");
  // If you set a secret in your PubSub webhook, validate it here...
  // For this sample, there is no secret configured so we just log it.
  const body = await req.json();
  console.log(
    "/api/messages/request-suggestions body",
    JSON.stringify(body, null, 4)
  );
  if (typeof body.threadId !== "string" && body.threadId) {
    console.error(
      "/api/messages/request-suggestions.ts: Invalid body."
    );
    return NextResponse.json(
      {
        error: "Invalid body.",
      },
      {
        status: 400,
      }
    );
  }
  // In production, you may want to validate the token (body.query[0]) and its claims (body.claims).
  return NextResponse.json({});
}
