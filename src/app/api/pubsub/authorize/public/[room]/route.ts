import { validateAppToken } from "@/utils/app-auth-utils";
import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { room: string } }
): Promise<NextResponse> {
  const token =
    req.cookies.get("Authorization")?.value ?? req.headers.get("Authorization");
  if (!token) {
    console.error(
      `/api/pubsub/authorize/public/${params.room}/route.ts: no 'Authorization' cookie, should contain app token`
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
  const tokenPayload = validateAppToken(token);
  if (!tokenPayload) {
    console.error(
      `/api/pubsub/authorize/public/${params.room}/route.ts: no 'Authorization' cookie, should contain app token`
    );
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
  const url = new URL(req.url);
  const hub = url.searchParams.get("event");
  console.log("/api/pubsub/connect hub", hub);
  const secret = url.searchParams.get("secret");
  console.log("/api/pubsub/connect secret", secret);
  const body = await req.json();
  console.log("/api/pubsub/connect body", JSON.stringify(body, null, 4));
  return NextResponse.json({});
}
