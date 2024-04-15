import { findAADUser } from "@/database/user";
import {
  IAppJwtToken,
  signAppToken,
  validateAppToken,
} from "@/utils/app-auth-utils";
import { Activity, Attachment, TurnContext } from "botbuilder";
import { botStorage } from "./bot-app";
import { isIUserClientState } from "@/models/user-client-state";
import { offerIntelligentSuggestionForText } from "@/utils/openai-utils";
import { suggestionCard } from "./cards";

/**
 * Utility function that converts bot context into an app user token.
 * This will be used to access endpoints on this app that only support custom app tokens (e.g., /api/notes/list/my)
 *
 * @param context bot context
 * @returns app-specific token
 */
export async function getAppAuthToken(context: TurnContext): Promise<string> {
  if (!context.activity.from.aadObjectId) {
    throw new Error("This user does not have a valid aadObjectId");
  }
  if (!context.activity.conversation.tenantId) {
    throw new Error("This conversation does not have a valid tenantId");
  }
  const user = await findAADUser(
    context.activity.from.aadObjectId!,
    // TODO: use tid from parsed MSAL token to support federated scenarios
    context.activity.conversation.tenantId!
  );
  if (!user) {
    throw new Error("No account linked to this AAD user");
  }
  // Depending on your auth provider, you may end up needing to implement some sort of oauth connection to your app
  // But if you can mint tokens within your service that may be easier
  const token = signAppToken(user, "aad");
  return token;
}

export async function getValidatedAppAuthToken(
  context: TurnContext
): Promise<IAppJwtToken | null> {
  const userAppToken = await getAppAuthToken(context);
  const jwtPayload = validateAppToken(userAppToken);
  return jwtPayload;
}

export function getTeamsThreadId(activity: Activity): string {
  if (activity.conversation.conversationType === "personal") {
    const userAadId =
      activity.from.aadObjectId ?? activity.recipient.aadObjectId;
    if (!userAadId) {
      throw new Error("Invalid user ID");
    }
    return `19:${userAadId}_${process.env.BOT_ID}@unq.gbl.spaces`;
  }
  return activity.conversation.id;
}

export async function getIntelligentSuggestionActivity(
  threadId: string,
  userId: string
): Promise<Partial<Activity> | null> {
  const storageKey = `custom/${threadId}/${userId}`;
  const storeItems = await botStorage.read([storageKey]);
  const currentAppState = storeItems[storageKey];
  if (!isIUserClientState(currentAppState)) {
    return null;
  }
  const editingNote = currentAppState.editingNote;
  if (!editingNote) {
    return null;
  }
  try {
    const suggestionText = await offerIntelligentSuggestionForText(
      editingNote.text
    );
    console.log(
      "/api/messages/request-suggestions.ts: openai suggestion",
      suggestionText
    );
    return {
      attachments: [
        suggestionCard({
          ...currentAppState,
          editingNote: {
            _id: editingNote._id,
            text: suggestionText,
          },
        }, false),
      ],
    };
  } catch (err) {
    console.error("/api/messages/request-suggestions.ts: openai error" + err);
    throw new Error("Internal error. OpenAI completion failed.");
  }
}
