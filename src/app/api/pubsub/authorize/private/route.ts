import { pubsubServiceClient } from "@/pubsub/pubsub-client";
import { validateAppToken } from "@/utils/app-auth-utils";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  const token =
    cookieStore.get("Authorization")?.value ?? req.headers.get("Authorization");
  if (!token) {
    console.error(
      `/api/pubsub/authorize/private/route.ts: no 'Authorization' cookie, should contain app token`
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
      `/api/pubsub/authorize/private/route.ts: no 'Authorization' cookie, should contain app token`
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
  try {
    const pubsubToken = await pubsubServiceClient.getClientAccessToken({
      userId: tokenPayload.user._id,
      expirationTimeInMinutes: 60,
      roles: [
        `webpubsub.joinLeaveGroup.${tokenPayload.user._id}`,
        `webpubsub.sendToGroup.${tokenPayload.user._id}`,
      ],
      groups: [tokenPayload.user._id],
    });
    return NextResponse.json(pubsubToken);
  } catch (err) {
    console.error(
      `/api/pubsub/authorize/private/route.ts: getClientAccessTokenError ${err}`
    );
    return NextResponse.json(
      {
        error:
          "An internal error occurred. Unable to get client access token for pubsub service.",
      },
      {
        status: 500,
      }
    );
  }
}
