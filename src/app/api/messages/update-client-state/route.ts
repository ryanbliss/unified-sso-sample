import { botStorage } from "@/bot/bot-app";
import { PubSubEventTypes } from "@/models/pubsub-event-types";
import { isIUserClientState } from "@/models/user-client-state";
import { pubsubServiceClient } from "@/pubsub/pubsub-client";
import { validateAppToken } from "@/utils/app-auth-utils";
import { StoreItems } from "botbuilder";
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
  if (!jwtPayload) {
    console.error("/api/messages/update-client-state.ts: Invavlid token.");
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
  
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
  const changes: StoreItems = {};
  // TODO: handle personal app case where threadId isn't known
  // Store client state in bot storage
  changes[`custom/${body.threadId}/${jwtPayload.user._id}`] = body;
  await botStorage.write(changes);
  const url = new URL(req.url);
  if (url.searchParams.get("sendPubSub") === "true") {
    await pubsubServiceClient.group(jwtPayload.user._id).sendToAll({
      type: PubSubEventTypes.UPDATE_USER_CLIENT_STATE,
      data: body,
    });
  }
  // In production, you may want to validate the token (body.query[0]) and its claims (body.claims).
  return NextResponse.json({});
}
