import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const hub = url.searchParams.get("event");
  console.log("/api/pubsub/connect hub", hub);
  const secret = url.searchParams.get("secret");
  console.log("/api/pubsub/connect secret", secret);
  const body = await req.json();
  console.log("/api/pubsub/connect body", JSON.stringify(body, null, 4));
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
