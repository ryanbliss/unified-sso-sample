import { createNote, isNoteEditable } from "@/database/notes";
import { validateAppToken } from "@/utils/app-auth-utils";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rudimentary signout endpoint. In production, you should revoke the old token as well.
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const token =
    req.cookies.get("Authorization")?.value ?? req.headers.get("Authorization");
  if (!token) {
    console.error(
      "/api/notes/create/route.ts: no 'Authorization' cookie, should contain app token"
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
    console.error("/api/notes/create/route.ts: invalid app token");
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
  const body = await req.json();
  if (!isNoteEditable(body)) {
    console.error("/api/notes/create/route.ts: invalid app token");
    return NextResponse.json(
      {
        error: "Bad request. Request body is not type NoteEditable.",
      },
      {
        status: 400,
      }
    );
  }
  const note = await createNote(body, jwtPayload.user._id);

  return NextResponse.json({
    note: {
      ...note,
      _id: note._id.toString(),
    },
  });
}
