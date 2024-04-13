import { pubsubServiceClient } from "@/pubsub/pubsub-client";
import { validateAppToken } from "@/utils/app-auth-utils";
import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token =
    req.cookies.get("Authorization")?.value ?? req.headers.get("Authorization");
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
  const pubsubToken = pubsubServiceClient.getClientAccessToken({
    userId: tokenPayload.user._id,
    expirationTimeInMinutes: 60,
    roles: [
      `webpubsub.joinLeaveGroup.${tokenPayload.user._id}`,
      `webpubsub.sendToGroup.${tokenPayload.user._id}`,
    ],
    groups: [tokenPayload.user._id],
  });
  return NextResponse.json({
    connectionUrl: `wss://unify-sso-generic-pubsub.webpubsub.azure.com/client/hubs/copilot?access_token=${pubsubToken}`,
  });
}
