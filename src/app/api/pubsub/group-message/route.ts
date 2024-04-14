import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log(
    "/api/pubsub/note-change origin",
    req.headers.get("WebHook-Request-Origin")
  );
  const url = new URL(req.url);
  const hub = url.searchParams.get("hub");
  console.log("/api/pubsub/group-message hub", hub);
  // If you set a secret in your PubSub webhook, validate it here...
  // For this sample, there is no secret configured so we just log it.
  const secret = url.searchParams.get("secret");
  console.log("/api/pubsub/group-message secret", secret);
  const body = await req.json();
  console.log("/api/pubsub/group-message body", JSON.stringify(body, null, 4));
  // In production, you may want to validate the token (body.query[0]) and its claims (body.claims).
  return NextResponse.json(
    {},
    {
      headers: {
        "WebHook-Allowed-Origin":
          "https://unify-sso-generic-pubsub.webpubsub.azure.com",
      },
    }
  );
}
