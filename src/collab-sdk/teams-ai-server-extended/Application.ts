import { Application as ApplicationBase, TurnState } from "@microsoft/teams-ai";
import { TurnContext } from "botbuilder";
import { isEmbedTurnContext } from "./turn-context-extended";
import { isIBotInteropActionRequestData } from "../shared/request-types";
import { Embed } from "./Embed";

export class Application<
  TState extends TurnState = TurnState
> extends ApplicationBase<TState> {
  embed = new Embed();

  /**
   * Dispatches an incoming activity to a handler registered with the application.
   * @remarks
   * This method should be called from your bot's "turn handler" (its primary message handler)
   *
   * ```JavaScript
   * server.post('/api/messages', async (req, res) => {
   *    await adapter.processActivity(req, res, async (context) => {
   *      await bot.run(context);
   *   });
   * });
   * ```
   * @param {TurnContext} turnContext Context class for the current turn of conversation with the user.
   * @returns {Promise<boolean>} True if the activity was successfully dispatched to a handler. False if no matching handlers could be found.
   */
  public async run(turnContext: TurnContext): Promise<boolean> {
    if (isEmbedTurnContext(turnContext)) {
      if (isIBotInteropActionRequestData(turnContext.embed)) {
        try {
          const response = await this.embed.processAction(
            turnContext.embed.action.type,
            turnContext,
            turnContext.embed.action.customData
          );
          turnContext.onEmbedSuccess(response);
        } catch (err) {
          console.error(err);
          turnContext.onEmbedFailure(
            500,
            "Unable to process the action. Check server logs for more details."
          );
        }
      }
      return true;
    }
    return super.run(turnContext);
  }
}
