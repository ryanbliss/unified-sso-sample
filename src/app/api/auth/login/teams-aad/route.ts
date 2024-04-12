import { findAADUser } from "@/database/user";
import { NextRequest, NextResponse } from "next/server";
import { signAppToken } from "@/utils/app-auth-utils";
import { exchangeTeamsTokenForMSALToken } from "@/utils/msal-token-utils";

/**
 * Rudimentary login implementation that exchanges Teams AAD token for app token.
 * Meant to show basic example of exchanging Teams token for app token for illustrative purposes.
 * While the AAD token validation & basic process of token exchange is realistic, the app token signing process is rudimentary.
 * In production, you'd likely want to use a robust identity system/toolkit, like Azure AAD, Passport, OneLogin, Auth0, etc.
 * The connection process for those identity systems would be similar to this, though.
 * The important concept is that you join the AAD identity to your app user, validate the AAD token, and then exchange for your app token.
 *
 * @param req request
 * @returns response
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const teamsToken = req.headers.get("Authorization");
  if (!teamsToken) {
    console.error(
      "/api/auth/login/teams-aad/route.ts: no 'Authorization' header"
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
  const msalResult = await exchangeTeamsTokenForMSALToken(teamsToken);
  const user = await findAADUser(
    msalResult.account.localAccountId,
    msalResult.account.tenantId
  );
  if (!user) {
    console.error(
      "/api/auth/login/teams-aad/route.ts invalid login attempt, user does not exist"
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
  const token = signAppToken(user, "aad");
  const connections: string[] = [];
  if (user.connections?.aad) {
    connections.push("aad");
  }
  const response = NextResponse.json({
    success: true,
    connections,
  });
  response.cookies.set({
    name: "Authorization",
    value: token,
    sameSite: "none",
    secure: true,
  });
  return response;
}
