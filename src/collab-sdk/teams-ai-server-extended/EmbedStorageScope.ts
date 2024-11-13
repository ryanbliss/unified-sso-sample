import { TurnState } from "@microsoft/teams-ai";
import { TurnContext } from "botbuilder";
import { IConversationContext } from "./turn-context-extended";

export class EmbedStorageScope<TState extends TurnState = TurnState> {
  private didSetHandlers: Map<
    string,
    (
      context: IConversationContext,
      state: TState,
      value: any,
      previousValue: any
    ) => Promise<any>
  > = new Map();

  /**
   * Registers a didSet callback when a value was set by an embedded application.
   *
   * @param key action unique identifying type
   * @param handler handler function to be called when action is received. The handler should return a boolean indicating whether the value is approved or not.
   * @param handler.context context of the current turn
   * @param handler.state state of the current turn
   * @param handler.value value sent by the embed application to set
   * @param handler.previousValue previous value of the key
   */
  public didSet<TValue = any>(
    key: string,
    handler: (
      context: IConversationContext,
      state: TState,
      value: TValue,
      previousValue: TValue
    ) => Promise<void>
  ) {
    this.didSetHandlers.set(key, handler);
  }

  /**
   * @hidden
   */
  async processDidSet(
    context: IConversationContext,
    state: TState,
    key: string,
    value: any,
    previousValue: any
  ): Promise<void> {
    const handler = this.didSetHandlers.get(key);
    if (!handler) {
      return;
    }
    return await handler(context, state, value, previousValue);
  }
}
