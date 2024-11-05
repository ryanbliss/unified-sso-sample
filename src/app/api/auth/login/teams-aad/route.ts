import { IUser, findAADUser } from "@/server/database/user";
import { NextRequest, NextResponse } from "next/server";
import { signAppToken } from "@/server/utils/app-auth-utils";
import {
  IValidatedAuthenticationResult,
  cacheMSALResultWithCode,
  decodeMSALToken,
  exchangeTeamsTokenForMSALToken,
} from "@/server/utils/msal-token-utils";
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
  const cookieStore = cookies();
  const msalToken = req.headers.get("Authorization");
  if (!msalToken) {
    console.error(
      "/api/auth/login/teams-aad/route.ts: no 'Authorization' header"
    );
    return NextResponse.json(
      {
        error: "Invalid 'Authorization' header",
      },
      {
        status: 400,
      }
    );
  }
  const msalResult = decodeMSALToken(msalToken);
  let user: IUser | null;
  try {
    user = await findAADUser(msalResult.oid, msalResult.tid);
  } catch (err) {
    console.error(
      `/api/auth/login/teams-aad/route.ts error while findAADUser ${err}\n${msalResult}`
    );
    return NextResponse.json(
      {
        error: "An internal error occurred",
      },
      {
        status: 500,
      }
    );
  }
  if (!user) {
    console.error(
      "/api/auth/login/teams-aad/route.ts invalid login attempt, user does not exist"
    );
    const code = cacheMSALResultWithCode(msalResult);
    cookieStore.set({
      name: "AADConnectionCode",
      value: code,
      sameSite: "none",
      secure: true,
    });
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
  cookieStore.set({
    name: "Authorization",
    value: token,
    sameSite: "none",
    secure: true,
  });
  return NextResponse.json({
    success: true,
    connections,
  });
}
