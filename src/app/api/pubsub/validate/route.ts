import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  console.log(
    "/api/pubsub/validate hub",
    req.headers.get("WebHook-Request-Origin")
  );
  const url = new URL(req.url);
  const hub = url.searchParams.get("event");
  console.log("/api/pubsub/validate hub", hub);
  const secret = url.searchParams.get("secret");
  console.log("/api/pubsub/validate secret", secret);
  const body = await req.json();
  console.log("/api/pubsub/validate body", JSON.stringify(body, null, 4));
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
