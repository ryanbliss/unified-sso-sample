import { TurnContext } from "botbuilder";

export class Embed {
  private handlers: Map<
    string,
    (context: TurnContext, data: any) => Promise<any>
  > = new Map();
  action<TActionPayload = any, TResponseType = any>(
    type: string,
    handler: (
      context: TurnContext,
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
    return await handler(context, data);
  }
}
