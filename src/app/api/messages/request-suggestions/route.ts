import { botStorage, sendProactiveMessage } from "@/bot/bot-app";
import { suggestionCard } from "@/bot/cards";
import { prepareBotPromptFiles } from "@/bot/fs-utils";
import { isIUserClientState } from "@/models/user-client-state";
import { validateAppToken } from "@/utils/app-auth-utils";
import { offerIntelligentSuggestionForText } from "@/utils/openai-utils";
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
  const threadReferenceId =
    body.threadId ?? jwtPayload.user.connections.aad.oid;
  if (typeof threadReferenceId !== "string") {
    console.error(
      "/api/messages/request-suggestions.ts: invalid thread reference id"
    );
    return NextResponse.json(
      {
        error: "Bad request. Invalid threadReferenceId",
      },
      {
        status: 400,
      }
    );
  }
  const storageKey = `custom/${body.threadId}/${jwtPayload.user._id}`;
  const storeItems = await botStorage.read([storageKey]);
  const currentAppState = storeItems[storageKey];
  if (!isIUserClientState(currentAppState)) {
    console.error(
      "/api/messages/request-suggestions.ts: currentAppState is null"
    );
    return NextResponse.json(
      {
        error: "Bad request. User app state is not known",
      },
      {
        status: 400,
      }
    );
  }
  const editText = currentAppState.editingNote?.text;
  if (!editText) {
    console.error(
      "/api/messages/request-suggestions.ts: no edit text in user's app state"
    );
    return NextResponse.json(
      {
        error: "Bad request. User's app state does not include edit text.",
      },
      {
        status: 400,
      }
    );
  }
  try {
    const suggestionText = await offerIntelligentSuggestionForText(editText);
    console.log(
      "/api/messages/request-suggestions.ts: openai suggestion",
      suggestionText
    );
    await sendProactiveMessage(threadReferenceId, {
      attachments: [suggestionCard(suggestionText, false)],
    });
  } catch (err) {
    console.error("/api/messages/request-suggestions.ts: openai error" + err);
    return NextResponse.json(
      {
        error: "Internal error. OpenAI completion failed.",
      },
      {
        status: 500,
      }
    );
  }
  return NextResponse.json({
    messageSent: true,
  });
}
