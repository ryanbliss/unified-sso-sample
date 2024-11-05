import { findAADUser } from "@/server/database/user";
import {
  IAppJwtToken,
  signAppToken,
  validateAppToken,
} from "@/server/utils/app-auth-utils";
import { Activity, TurnContext } from "botbuilder";
import { botStorage } from "./bot-app";
import { isIUserClientState } from "@/shared/models/user-client-state";
import { getIntelligentSuggestionForText } from "@/server/utils/openai-utils";
import { createAppSignInCard, suggestionCard } from "./cards";

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

/**
 * Returns relevant Teams thread identifier for a given activity.
 * Personal apps have a conversation.id that is different than what Teams uses.
 * @param activity bot activity
 * @returns relevant thread identifier for Teams for a given activity
 */
export function getTeamsActivityThreadId(activity: Activity): string {
  if (activity.conversation.conversationType === "personal") {
    const userAadId = activity.from.aadObjectId;
    if (!userAadId) {
      throw new Error("bot-utils getTeamsActivityThreadId: Invalid user ID");
    }
    return getTeamsPersonalScopeThreadId(userAadId);
  }
  return activity.conversation.id;
}

/**
 * Returns relevant Teams thread identifier for a user's 1:1 chat with a bot.
 * @param userAadId user aad object id
 * @returns Teams threadId for personal bot <-> user chat
 */
export function getTeamsPersonalScopeThreadId(userAadId: string): string {
  return `19:${userAadId}_${process.env.NEXT_PUBLIC_BOT_ID}@unq.gbl.spaces`;
}

/**
 * Get the intelligent suggestion message activity to send for a given thread.
 *
 * @remarks
 * Looks up the user's current selected note within the tab application.
 * Note text is then passed into OpenAI to provide an intelligent suggestion.
 *
 * @param threadId Teams threadId
 * @param userId app userId (mongodb id, not aad id)
 * @returns
 */
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
    const suggestionText = await getIntelligentSuggestionForText(
      editingNote.text
    );
    console.log(
      "/api/messages/request-suggestions.ts: openai suggestion",
      suggestionText
    );
    return {
      attachments: [
        suggestionCard(
          {
            ...currentAppState,
            editingNote: {
              _id: editingNote._id,
              text: suggestionText,
            },
          },
          false
        ),
      ],
    };
  } catch (err) {
    console.error("/api/messages/request-suggestions.ts: openai error" + err);
    throw new Error("Internal error. OpenAI completion failed.");
  }
}

/**
 * Send the initial app sign in card for a user to connect their AAD identity to their app one.
 *
 * @remarks
 * Refers to app authentication, not initial AAD consent / token retrieval.
 *
 * @param context bot turn context
 */
export async function sendAppSignInCard(context: TurnContext): Promise<void> {
  const appSignInCard = createAppSignInCard(context.activity.from.name);
  await context.sendActivity({
    attachments: [appSignInCard],
  });
}
