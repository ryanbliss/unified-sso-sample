import { ApplicationOptions, TurnState } from "@microsoft/teams-ai";
import { TurnContext } from "botbuilder";
import { EmbedStorage } from "./EmbedStorage";

export class Embed<TState extends TurnState = TurnState> {
  private _options: ApplicationOptions<TState>;
  public readonly storage: EmbedStorage<TState>;

  constructor(options: ApplicationOptions<TState>) {
    this._options = options;
    this.storage = new EmbedStorage(options);
  }

  private handlers: Map<
    string,
    (context: TurnContext, state: TState, data: any) => Promise<any>
  > = new Map();

  /**
   * Registers an embed action handler.
   *
   * @param type action unique identifying type
   * @param handler handler function to be called when action is received
   * @param handler.context context of the current turn
   * @param handler.state state of the current turn
   * @param handler.data data sent by the embed application with the action
   */
  public action<TActionPayload = any, TResponseType = any>(
    type: string,
    handler: (
      context: TurnContext,
      state: TState,
      data: TActionPayload
    ) => Promise<TResponseType>
  ) {
    this.handlers.set(type, handler);
  }

  /**
   * @hidden
   */
  async processAction(type: string, context: TurnContext, data: any) {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler for action type "${type}"`);
    }
    const { storage, turnStateFactory } = this._options;
    const state = turnStateFactory();
    await state.load(context, storage);
    return await handler(context, state, data);
  }
}
