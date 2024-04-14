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
