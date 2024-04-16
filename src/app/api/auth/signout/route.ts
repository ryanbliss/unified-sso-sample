import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rudimentary signout endpoint. In production, you should revoke the old token as well.
 * @param req request
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  cookieStore.set({
    name: "Authorization",
    value: "",
    sameSite: "none",
    secure: true,
  });
  return NextResponse.redirect(new URL("/auth/login", req.url));
}
