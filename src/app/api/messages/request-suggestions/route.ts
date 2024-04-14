import { sendProactiveMessage } from "@/bot/bot-app";
import { prepareBotPromptFiles } from "@/bot/fs-utils";
import { validateAppToken } from "@/utils/app-auth-utils";
import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("/api/messages/request-suggestions");
  // Next.js is a bit of a pain to get working with these static files.
  // It chunks everything it needs as it needs it.
  // teams-ai requires these files be static at a set path, so this should be a fine workaround for now.
  prepareBotPromptFiles();
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
    console.error("/api/messages/request-suggestions.ts: Invavlid token.");
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
  if (!jwtPayload.user.connections?.aad) {
    console.error("/api/messages/request-suggestions.ts: not an aad user.");
    return NextResponse.json(
      {
        error: "Invalid request",
      },
      {
        status: 400,
      }
    );
  }

  // If you set a secret in your PubSub webhook, validate it here...
  // For this sample, there is no secret configured so we just log it.
  const body = await req.json();
  console.log(
    "/api/messages/request-suggestions body",
    JSON.stringify(body, null, 4)
  );
  if (typeof body.threadId !== "string" && body.threadId) {
    console.error("/api/messages/request-suggestions.ts: Invalid body.");
    return NextResponse.json(
      {
        error: "Invalid body.",
      },
      {
        status: 400,
      }
    );
  }
  const threadReferenceId = body.threadId ?? jwtPayload.user.connections.aad;
  if (typeof threadReferenceId !== "string") {
    throw new Error(
      "/api/messages/request-suggestions.ts: invalid thread reference id"
    );
  }
  await sendProactiveMessage(
    threadReferenceId,
    `Placeholder message for what will become a suggestion message`
  );
  return NextResponse.json({
    messageSent: true,
  });
}
