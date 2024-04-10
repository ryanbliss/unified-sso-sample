import { sendMessage } from "@/bot/bot-app";
import validateTeamsToken from "@/utils/token-utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("Authorization");
  if (!token) {
    throw new Error("/api/messages/route.ts: no 'Authorization' header");
  }
  const jwtPayload = await validateTeamsToken(token);
  const json = await req.json();
  console.log("/api/messages/route.ts body:", json);
  if (!isISendMessageInputBase(json)) {
    throw new Error(
      "/api/messages/route.ts: invalid body, must be of type ISendMessageInputBase"
    );
  }
  const threadReferenceId =
    json.scope === "personal" ? jwtPayload["oid"] : json.threadId;
  if (typeof threadReferenceId !== "string") {
    throw new Error("/api/messages/route.ts: invalid thread reference id");
  }
  await sendMessage(
    threadReferenceId,
    `Sending with data: ${JSON.stringify(json.data)}`
  );
  return NextResponse.json({
    messageSent: true,
  });
}

interface ISendMessageInputBase {
  scope: "personal" | "chat" | "channel";
  threadId: string | undefined;
  data: any;
}

function isISendMessageInputBase(value: any): value is ISendMessageInputBase {
  return (
    value &&
    ["personal", "chat", "channel"].includes(value.scope) &&
    (value.threadId === undefined || typeof value.threadId === "string")
  );
}
