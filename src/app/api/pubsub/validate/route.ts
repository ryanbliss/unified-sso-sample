import { NextRequest, NextResponse } from "next/server";

/**
 * Pubsub webhook endpoint
 * @param req request
 */
export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  const allowedOrigin = "unify-sso-generic-pubsub.webpubsub.azure.com";
  const requestOrigin = req.headers.get("WebHook-Request-Origin");
  console.log("/api/pubsub/validate hub", requestOrigin);
  if (requestOrigin !== allowedOrigin) {
    return NextResponse.json(
      {
        error: "Invalid origin.",
      },
      {
        status: 400,
      }
    );
  }
  return NextResponse.json(
    {},
    {
      headers: {
        "WebHook-Allowed-Origin": allowedOrigin,
      },
    }
  );
}
