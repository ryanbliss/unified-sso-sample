import {
  DefaultConversationState,
  DefaultTempState,
  DefaultUserState,
  TurnState,
} from "@microsoft/teams-ai";
import { TurnContext } from "botbuilder";

/**
 * @private
 */
export const CONVERSATION_SCOPE = "conversation";

/**
 * @private
 */
export const USER_SCOPE = "user";

export class EmbedTurnState<
  TConversationState = DefaultConversationState,
  TUserState = DefaultUserState,
  TTempState = DefaultTempState
> extends TurnState<TConversationState, TUserState, TTempState> {
  /**
   * Computes the storage keys for the state scopes being persisted.
   * @remarks
   * Can be overridden in derived classes to add additional storage scopes.
   * @param {TurnContext} context Context for the current turn of conversation with the user.
   * @returns {Promise<Record<string, string>>} A dictionary of scope names -> storage keys.
   * @throws Error if the context is missing a required property.
   */
  protected override onComputeStorageKeys(
    context: TurnContext
  ): Promise<Record<string, string>> {
    // Compute state keys
    const activity = context.activity;
    const channelId = activity?.channelId;
    const botId = activity?.recipient?.id;
    const conversationId = activity?.conversation?.id;
    const userId = activity?.from?.id;

    if (!channelId) {
      throw new Error("missing context.activity.channelId");
    }

    if (!botId) {
      throw new Error("missing context.activity.recipient.id");
    }

    if (!conversationId) {
      throw new Error("missing context.activity.conversation.id");
    }

    if (!userId) {
      throw new Error("missing context.activity.from.id");
    }

    const keys: Record<string, string> = {};
    keys[
      CONVERSATION_SCOPE
    ] = `${channelId}/${botId}/conversations/${conversationId}/embed`;
    keys[USER_SCOPE] = `${channelId}/${botId}/users/${userId}/embed`;
    return Promise.resolve(keys);
  }
}
