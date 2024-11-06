import {
  Application as ApplicationBase,
  ApplicationOptions,
  TurnState,
} from "@microsoft/teams-ai";
import { TeamsInfo, TurnContext } from "botbuilder";
import { isEmbedTurnContext } from "./turn-context-extended";
import {
  isIBotInteropActionRequestData,
  isIBotInteropGetRosterRequestData,
  isIBotInteropGetValuesRequestData,
  isIBotInteropSetValueRequestData,
} from "../shared/request-types";
import { Embed } from "./Embed";

export class Application<
  TState extends TurnState = TurnState
> extends ApplicationBase<TState> {
  public readonly embed: Embed;

  /**
   * Creates a new Application instance.
   * @param {ApplicationOptions<TState>} options Optional. Options used to configure the application.
   */
  public constructor(options?: Partial<ApplicationOptions<TState>>) {
    super(options);
    // @ts-expect-error - This is a private property, but we need to access it to create the embed instance.
    this.embed = new Embed(this._options);
  }

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
      } else if (isIBotInteropGetValuesRequestData(turnContext.embed)) {
        try {
          const response = await this.embed.storage.processGetValues(
            turnContext
          );
          turnContext.onEmbedSuccess(response);
        } catch (err) {
          console.error(err);
          turnContext.onEmbedFailure(
            500,
            "Unable to get the values. Check server logs for more details."
          );
        }
      } else if (isIBotInteropSetValueRequestData(turnContext.embed)) {
        try {
          await this.embed.storage.processSetValue(
            turnContext,
            turnContext.embed.scope,
            turnContext.embed.key,
            turnContext.embed.value
          );
          turnContext.onEmbedSuccess({ result: "success" });
        } catch (err) {
          console.error(err);
          turnContext.onEmbedFailure(
            500,
            "Unable to set the value. Check server logs for more details."
          );
        }
      } else if (isIBotInteropGetRosterRequestData(turnContext.embed)) {
        try {
          const pagedMembers = await TeamsInfo.getPagedMembers(turnContext, 100, turnContext.embed.continuationToken);
          turnContext.onEmbedSuccess(pagedMembers);
        } catch (err) {
          console.error(err);
          turnContext.onEmbedFailure(
            500,
            "Unable to set the value. Check server logs for more details."
          );
        }
      }
      return true;
    }
    return super.run(turnContext);
  }
}
