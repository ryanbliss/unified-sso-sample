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
  // In production apps that work outside of Teams, you'd likely want a request header/param for "redirectTo"
  // In Teams, you'd go to your Teams-specific route; out of Teams, you'd go to your normal route.
  return NextResponse.redirect(new URL("/auth/teams", req.url));
}
