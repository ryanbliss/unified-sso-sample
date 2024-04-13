import { sendMessage } from "@/bot/bot-app";
import { prepareBotPromptFiles } from "@/bot/fs-utils";
import { exchangeTeamsTokenForMSALToken } from "@/utils/msal-token-utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Next.js is a bit of a pain to get working with these static files.
  // It chunks everything it needs as it needs it.
  // teams-ai requires these files be static at a set path, so this should be a fine workaround for now.
  prepareBotPromptFiles();
  const token = req.headers.get("Authorization");
  if (!token) {
    throw new Error("/api/messages/route.ts: no 'Authorization' header");
  }
  const msalResult = await exchangeTeamsTokenForMSALToken(token);
  const json = await req.json();
  console.log("/api/messages/route.ts body:", json);
  if (!isISendMessageInputBase(json)) {
    throw new Error(
      "/api/messages/route.ts: invalid body, must be of type ISendMessageInputBase"
    );
  }
  const threadReferenceId = json.threadId ?? msalResult.account.localAccountId;
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
