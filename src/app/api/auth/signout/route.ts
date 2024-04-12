import { NextRequest, NextResponse } from "next/server";

/**
 * Rudimentary signout endpoint. In production, you should revoke the old token as well.
 * @param req request
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/auth/login", req.url));
  console.log("/api/auth/signout cookies", JSON.stringify(response.cookies.getAll()))
  response.cookies.delete("Authorization");
  return response;
}
