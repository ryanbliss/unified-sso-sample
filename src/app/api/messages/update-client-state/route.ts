import { isIUserClientState } from "@/models/user-client-state";
import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("/api/messages/update-client-state");
  const body = await req.json();
  console.log(
    "/api/messages/update-client-state body",
    JSON.stringify(body, null, 4)
  );
  if (!isIUserClientState(body)) {
    console.error(
      "/api/messages/update-client-state.ts: Invalid body. Body must be of type IUserClientState"
    );
    return NextResponse.json(
      {
        error: "Invalid body. Body must be of type IUserClientState",
      },
      {
        status: 400,
      }
    );
  }
  // In production, you may want to validate the token (body.query[0]) and its claims (body.claims).
  return NextResponse.json({});
}
