import { botStorage } from "@/bot/bot-app";
import { buildTeamsThreadId } from "@/bot/bot-utils";
import { PubSubEventTypes } from "@/models/pubsub-event-types";
import { isIUserClientState } from "@/models/user-client-state";
import { pubsubServiceClient } from "@/pubsub/pubsub-client";
import { validateAppToken } from "@/utils/app-auth-utils";
import { StoreItems } from "botbuilder";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  // Validate request includes an Authorization token
  const token =
    cookieStore.get("Authorization")?.value ?? req.headers.get("Authorization");
  if (!token) {
    console.error(
      "/api/notes/list/route.ts: no 'Authorization' cookie or header, should contain app token"
    );
    return NextResponse.json(
      {
        error: "Must include an 'Authorization' cookie or header with a valid app token",
      },
      {
        status: 400,
      }
    );
  }
  // Validate user has valid app auth token
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
  // Parse the request body
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
  // If not threadId was provided, user is in the personal app.
  const threadId =
    body.threadId ??
    buildTeamsThreadId(jwtPayload.user.connections?.aad?.oid ?? "");
  const key = `custom/${threadId}/${jwtPayload.user._id}`;
  // Check for existing value to get eTag, if there is one
  const existingValue = (await botStorage.read([key]))[key];
  if (existingValue) {
    // Set the latest storage eTag (used to prevent conflict resolution)
    (body as any).eTag = existingValue.eTag;
  }
  // Store client state in bot storage
  const changes: StoreItems = {};
  changes[key] = body;
  await botStorage.write(changes);
  const url = new URL(req.url);
  // Only send pubsub when bot is initiating the change, since client already has the state otherwise
  if (url.searchParams.get("sendPubSub") === "true") {
    await pubsubServiceClient.group(jwtPayload.user._id).sendToAll({
      type: PubSubEventTypes.UPDATE_USER_CLIENT_STATE,
      data: body,
    });
  }
  return NextResponse.json({});
}
