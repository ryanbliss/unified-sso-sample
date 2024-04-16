import { getUserNotes } from "@/database/notes";
import { validateAppToken } from "@/utils/app-auth-utils";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rudimentary signout endpoint. In production, you should revoke the old token as well.
 * @param req request
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  const token =
    cookieStore.get("Authorization")?.value ?? req.headers.get("Authorization");
  if (!token) {
    console.error(
      "/api/notes/list/route.ts: no 'Authorization' cookie, should contain app token"
    );
    return NextResponse.json(
      {
        error: "Must include an 'Authorization' cookie with a valid app token",
      },
      {
        status: 400,
      }
    );
  }
  const jwtPayload = validateAppToken(token);
  if (!jwtPayload) {
    console.error("/api/notes/list/route.ts: invalid app token");
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
  const notes = await getUserNotes(jwtPayload.user._id);
  const notesSendable = notes.map((note) => ({
    ...note,
    _id: note._id.toString(),
  }));

  return NextResponse.json({
    notes: notesSendable,
  });
}
