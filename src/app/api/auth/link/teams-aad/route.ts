import { IUser, findAADUser, findUser, upsertUser } from "@/database/user";
import { NextRequest, NextResponse } from "next/server";
import { signAppToken, validateAppToken } from "@/utils/app-auth-utils";
import {
  IValidatedAuthenticationResult,
  addAADConnection,
  exchangeTeamsTokenForMSALToken,
} from "@/utils/msal-token-utils";
import { cookies } from "next/headers";

/**
 * Rudimentary account linking implementation that links app account with AAD account.
 * Meant to show basic example of account linking illustrative purposes.
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
  const teamsToken = req.headers.get("Authorization");
  if (!teamsToken) {
    console.error(
      "/api/auth/link/teams-aad/route.ts: no 'Authorization' header, should contain Teams AAD token"
    );
    return NextResponse.json(
      {
        error:
          "Must include an 'Authorization' header with a valid Teams AAD token",
      },
      {
        status: 400,
      }
    );
  }
  const appToken = cookieStore.get("Authorization");
  if (!appToken) {
    console.error(
      "/api/auth/link/teams-aad/route.ts: no 'Authorization' cookie, should contain app token"
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
  // Validate app token
  const appJwtPayload = validateAppToken(appToken.value);
  if (!appJwtPayload) {
    console.error(
      "/api/auth/link/teams-aad/route.ts: invalid app token payload"
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
  // Validate Teams token
  let msalResult: IValidatedAuthenticationResult;
  try {
    msalResult = await exchangeTeamsTokenForMSALToken(teamsToken);
  } catch (err) {
    console.error(
      `/api/auth/link/teams-aad/route.ts error exchanging teams token, err: ${err}`
    );
    return NextResponse.json(
      {
        error: "Invalid MSAL response",
      },
      {
        status: 400,
      }
    );
  }
  // Check if this AAD identity has already been linked to another account
  let user: IUser | null;
  try {
    user = await findAADUser(
      msalResult.account.localAccountId,
      msalResult.account.tenantId
    );
  } catch (err) {
    console.error(
      `/api/auth/link/teams-aad/route.ts error finding aad user, err: ${err}`
    );
    return NextResponse.json(
      {
        error: "Failed to find AAD user",
      },
      {
        status: 500,
      }
    );
  }
  if (user) {
    console.error(
      "/api/auth/link/teams-aad/route.ts AAD identity is already linked to an account"
    );
    return NextResponse.json(
      {
        error: "AAD identity is already linked to an account",
      },
      {
        status: 401,
      }
    );
  }
  // Find app user
  const appUser = await findUser(appJwtPayload.user.email);
  if (!appUser) {
    console.error(
      "/api/auth/link/teams-aad/route.ts app user does not exist, despite token being valid for user, INTERNAL CODE 10101"
    );
    return NextResponse.json(
      {
        error: "Internal error [code 10101]: unexpected error occurred",
      },
      {
        status: 500,
      }
    );
  }
  // Upsert user with new connection
  const connections = addAADConnection(appUser.connections ?? {}, msalResult);
  try {
    const updatedUser = await upsertUser({
      email: appUser.email,
      password: appUser.password,
      connections,
    });
    // Mint new token with updated user info
    const token = signAppToken(updatedUser, "aad");
    cookieStore.set({
      name: "Authorization",
      value: token,
      sameSite: "none",
      secure: true,
    });
    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: "Internal Error [10305[: unable to link account",
      },
      {
        status: 500,
      }
    );
  }
}
