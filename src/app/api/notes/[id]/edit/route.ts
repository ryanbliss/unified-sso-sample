import { editNote, isNoteEditable } from "@/server/database/notes";
import { PubSubEventTypes } from "@/shared/models/pubsub-event-types";
import { pubsubServiceClient } from "@/server/pubsub/pubsub-client";
import { validateAppToken } from "@/server/utils/app-auth-utils";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rudimentary signout endpoint. In production, you should revoke the old token as well.
 * @param req request
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const cookieStore = cookies();
  const token =
    cookieStore.get("Authorization")?.value ?? req.headers.get("Authorization");
  if (!token) {
    console.error(
      "/api/notes/[id]/edit/route.ts: no 'Authorization' cookie, should contain app token"
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
    console.error("/api/notes/[id]/edit/route.ts: invalid app token");
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
    console.error("/api/notes/[id]/edit/route.ts: invalid app token");
    return NextResponse.json(
      {
        error: "Bad request. Request body is not type NoteEditable.",
      },
      {
        status: 400,
      }
    );
  }
  const note = await editNote(params.id, body);
  const noteSendable = {
    ...note,
    _id: note._id.toString(),
    createdAt: note.createdAt.toISOString(),
    editedAt: note.editedAt.toISOString(),
  };

  try {
    console.log(`/api/notes/[id]/edit/route.ts: sending PubSub message`);
    // Notify any active websocket connections for this user of the change
    await pubsubServiceClient.group(jwtPayload.user._id).sendToAll({
      type: PubSubEventTypes.NOTE_CHANGE,
      data: noteSendable,
    });
    console.log(`/api/notes/[id]/edit/route.ts: sent PubSub message`);
  } catch (err) {
    console.error(
      `/api/notes/[id]/edit/route.ts: error sending PubSub message ${err}`
    );
  }

  return NextResponse.json({
    note: noteSendable,
  });
}
