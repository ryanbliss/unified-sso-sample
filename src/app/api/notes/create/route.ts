import { createNote, isNoteEditable } from "@/database/notes";
import { PubSubEventTypes } from "@/models/pubsub-event-types";
import { pubsubServiceClient } from "@/pubsub/pubsub-client";
import { validateAppToken } from "@/utils/app-auth-utils";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rudimentary signout endpoint. In production, you should revoke the old token as well.
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  const token =
    cookieStore.get("Authorization")?.value ?? req.headers.get("Authorization");
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
  const noteSendable = {
    ...note,
    _id: note._id.toString(),
    createdAt: note.createdAt.toISOString(),
    editedAt: note.editedAt.toISOString(),
  };

  try {
    console.log(`/api/notes/create/route.ts: sending PubSub message`);
    // Notify any active websocket connections for this user of the change
    await pubsubServiceClient.group(jwtPayload.user._id).sendToAll({
      type: PubSubEventTypes.NOTE_CHANGE,
      data: noteSendable,
    });
    console.log(`/api/notes/create/route.ts: sent PubSub message`);
  } catch (err) {
    console.error(
      `/api/notes/create/route.ts: error sending PubSub message ${err}`
    );
  }

  return NextResponse.json({
    note: noteSendable,
  });
}
