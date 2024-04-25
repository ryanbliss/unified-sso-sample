import { findUser, upsertUser } from "@/server/database/user";
import { NextRequest, NextResponse } from "next/server";
import { signAppToken, validateAppToken } from "@/server/utils/app-auth-utils";
import { cookies } from "next/headers";

/**
 * Rudimentary account linking implementation that removes account link for the app user.
 * Meant to show basic example of account linking illustrative purposes.
 * While the AAD token validation & basic process of token exchange is realistic, the app token signing process is rudimentary.
 * In production, you'd likely want to use a robust identity system/toolkit, like Azure AAD, Passport, OneLogin, Auth0, etc.
 *
 * @param req request
 * @returns response
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
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
  const connections = {
    ...appUser.connections,
    aad: undefined,
  };
  const user = await upsertUser({
    email: appUser.email,
    password: appUser.password,
    connections,
  });
  // Mint new token with updated user info
  const token = signAppToken(user, "email");
  
  cookieStore.set({
    name: "Authorization",
    value: token,
    sameSite: "none",
    secure: true,
  });
  return NextResponse.json({
    success: true,
  });
}
