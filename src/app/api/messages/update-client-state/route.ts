import { isIUserClientState } from "@/models/user-client-state";
import { validateAppToken } from "@/utils/app-auth-utils";
import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("/api/messages/update-client-state");
  const token =
    req.cookies.get("Authorization")?.value ?? req.headers.get("Authorization");
  if (!token) {
    console.error(
      "/api/notes/list/route.ts: no 'Authorization' cookie, should contain app token"
    );
    return NextResponse.json(
      {
        error: "Must include an 'Authorization' cookie with a valid app token",
      },
      {
        status: 400,
      }
    );
  }
  const jwtPayload = validateAppToken(token);
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
