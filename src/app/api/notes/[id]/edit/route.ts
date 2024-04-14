import { editNote, isNoteEditable } from "@/database/notes";
import { PubSubEventTypes } from "@/models/pubsub-event-types";
import { pubsubServiceClient } from "@/pubsub/pubsub-client";
import { validateAppToken } from "@/utils/app-auth-utils";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rudimentary signout endpoint. In production, you should revoke the old token as well.
 * @param req request
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const token =
    req.cookies.get("Authorization")?.value ?? req.headers.get("Authorization");
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
    createdAt: note.createdAt.toString(),
    editedAt: note.editedAt.toString(),
  };
  // Notify any active websocket connections for this user of the change
  pubsubServiceClient
    .group(jwtPayload.user._id)
    .sendToAll({
      type: PubSubEventTypes.NOTE_CHANGE,
      data: noteSendable,
    })
    .then(() => {
      console.log(`/api/notes/edit/route.ts: sent PubSub message`);
    })
    .catch((err) => {
      console.error(
        `/api/notes/edit/route.ts: error sending PubSub message ${err}`
      );
    });

  return NextResponse.json({
    note: noteSendable,
  });
}
