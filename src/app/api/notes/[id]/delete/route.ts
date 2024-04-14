import { deleteNote, editNote, isNoteEditable } from "@/database/notes";
import { IDeleteNoteResponse } from "@/models/note-base-models";
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
      "/api/notes/[id]/delete/route.ts: no 'Authorization' cookie, should contain app token"
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
    console.error("/api/notes/[id]/delete/route.ts: invalid app token");
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }
  await deleteNote(params.id);

  const responseData: IDeleteNoteResponse = {
    deletedId: params.id,
  };

  try {
    console.log(`/api/notes/[id]/delete/route.ts: sending PubSub message`);
    // Notify any active websocket connections for this user of the change
    await pubsubServiceClient.group(jwtPayload.user._id).sendToAll({
      type: PubSubEventTypes.DELETE_NOTE,
      data: responseData,
    });
    console.log(`/api/notes/[id]/delete/route.ts: sent PubSub message`);
  } catch (err) {
    console.error(
      `/api/notes/[id]/delete/route.ts: error sending PubSub message ${err}`
    );
  }

  return NextResponse.json(responseData);
}
