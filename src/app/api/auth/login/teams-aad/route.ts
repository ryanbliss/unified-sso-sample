import { findAADUser, findUser } from "@/database/user";
import { NextRequest, NextResponse } from "next/server";
import { signAppToken } from "@/utils/app-auth-utils";
import validateTeamsToken from "@/utils/token-utils";
import { cookies } from "next/headers";

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
    console.error("/api/auth/login/teams-aad/route.ts: no 'Authorization' header");
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
  const jwtPayload = await validateTeamsToken(teamsToken);
  const oid = jwtPayload.jwtPayload["oid"];
  if (!oid) {
    console.error("/api/auth/login/teams-aad/route.ts: Teams AAD token does not include oid");
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
  const tid = jwtPayload.jwtPayload["tid"];
  if (!tid) {
    console.error("/api/auth/login/teams-aad/route.ts: Teams AAD token does not include tid");
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
  const user = await findAADUser(oid, tid);
  if (!user) {
    console.error("/api/auth/login/teams-aad/route.ts invalid login attempt, user does not exist");
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
  cookies().set("Authorization", token);
  return NextResponse.json({
    success: true
  });
}
