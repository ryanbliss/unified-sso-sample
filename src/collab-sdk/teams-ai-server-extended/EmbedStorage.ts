import { ApplicationOptions, TurnState } from "@microsoft/teams-ai";
import { TurnContext } from "botbuilder";
import {
  CONVERSATION_SCOPE,
  EmbedTurnState,
  USER_SCOPE,
} from "./EmbedTurnState";
import {
  IBotInteropGetValuesRequestResponseData,
  TBotStorageScopeType,
} from "../shared";
import { EmbedStorageScope } from "./EmbedStorageScope";
import { IConversationContext } from "./turn-context-extended";

export class EmbedStorage<TState extends TurnState = TurnState> {
  private _options: ApplicationOptions<TState>;
  public readonly user = new EmbedStorageScope<TState>();
  public readonly conversation = new EmbedStorageScope<TState>();

  constructor(options: ApplicationOptions<TState>) {
    this._options = options;
  }

  /**
   * @hidden
   */
  async processSetValue(
    context: IConversationContext,
    scope: TBotStorageScopeType,
    key: string,
    value: any
  ): Promise<void> {
    const { storage, turnStateFactory } = this._options;
    const state = turnStateFactory();
    await state.load(context, storage);

    const embedState = new EmbedTurnState();
    await embedState.load(context, storage);
    if (scope === "user") {
      const path = `${USER_SCOPE}.${key}`;
      await this.user.processDidSet(
        context,
        state,
        key,
        value,
        embedState.getValue(path)
      );
      embedState.setValue(path, value);
    } else if (scope === "conversation") {
      const path = `${CONVERSATION_SCOPE}.${key}`;
      await this.conversation.processDidSet(
        context,
        state,
        key,
        value,
        embedState.getValue(path)
      );
      embedState.setValue(path, value);
    } else {
      throw new Error(
        "Invalid scope. Valid scopes are 'user' and 'conversation'"
      );
    }
    await embedState.save(context, storage);
  }

  /**
   * @hidden
   */
  async processGetValues(
    context: IConversationContext
  ): Promise<IBotInteropGetValuesRequestResponseData> {
    const { storage } = this._options;
    const state = new EmbedTurnState();
    await state.load(context, storage);
    return {
      user: state.user,
      conversation: state.conversation,
    };
  }
}
