import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rudimentary signout endpoint. In production, you should revoke the old token as well.
 * @param req request
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/auth/login", req.url));
  response.cookies.set({
    name: "Authorization",
    value: "",
    sameSite: "none",
    secure: true,
  });
  // Reset Next.js cache
  revalidatePath("/");
  revalidatePath("/connections");
  return response;
}
