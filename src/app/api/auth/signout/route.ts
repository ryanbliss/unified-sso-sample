import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Rudimentary signout endpoint. In production, you should revoke the old token as well.
 * @param req request
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  cookies().delete("Authorization");
  return NextResponse.redirect(new URL("/auth/login", req.url));
}
