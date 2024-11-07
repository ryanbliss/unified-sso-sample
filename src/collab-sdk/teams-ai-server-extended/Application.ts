import {
  Application as ApplicationBase,
  ApplicationOptions,
  TurnState,
} from "@microsoft/teams-ai";
import {
  ConfigurationServiceClientCredentialFactory,
  TeamsInfo,
  TurnContext,
} from "botbuilder";
import { IEmbedTurnContext, isEmbedTurnContext } from "./turn-context-extended";
import {
  isIBotInteropActionRequestData,
  isIBotInteropGetRosterRequestData,
  isIBotInteropGetValuesRequestData,
  isIBotInteropSetValueRequestData,
  IPermission,
  isIPermissionDetailsResponse,
  isIBotInteropGetInstalledRscPermissionsData,
} from "../shared";
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
          turnContext.embed.onEmbedSuccess(response);
        } catch (err) {
          console.error(err);
          turnContext.embed.onEmbedFailure(
            500,
            "Unable to process the action. Check server logs for more details."
          );
        }
      } else if (isIBotInteropGetValuesRequestData(turnContext.embed)) {
        try {
          const response = await this.embed.storage.processGetValues(
            turnContext
          );
          turnContext.embed.onEmbedSuccess(response);
        } catch (err) {
          console.error(err);
          turnContext.embed.onEmbedFailure(
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
          turnContext.embed.onEmbedSuccess({ result: "success" });
        } catch (err) {
          console.error(err);
          turnContext.embed.onEmbedFailure(
            500,
            "Unable to set the value. Check server logs for more details."
          );
        }
      } else if (isIBotInteropGetRosterRequestData(turnContext.embed)) {
        try {
          const pagedMembers = await TeamsInfo.getPagedMembers(
            turnContext,
            100,
            turnContext.embed.continuationToken
          );
          turnContext.embed.onEmbedSuccess(pagedMembers);
        } catch (err) {
          console.error(err);
          turnContext.embed.onEmbedFailure(
            500,
            "Unable to set the value. Check server logs for more details."
          );
        }
      } else if (
        isIBotInteropGetInstalledRscPermissionsData(turnContext.embed)
      ) {
        try {
          const permissions = await this.getRscPermissions(turnContext);
          turnContext.embed.onEmbedSuccess(permissions);
        } catch (err) {
          console.error(err);
          const message = (err as any)?.message;
          turnContext.embed.onEmbedFailure(
            500,
            message ?? "Unknown error, check server logs for more details"
          );
        }
      }
      return true;
    }
    return super.run(turnContext);
  }

  private get _credentialsFactory(): ConfigurationServiceClientCredentialFactory {
    const credentialsFactory = this.options.adapter?.credentialsFactory;
    if (
      !credentialsFactory ||
      !(
        credentialsFactory instanceof
        ConfigurationServiceClientCredentialFactory
      )
    ) {
      throw new Error(
        "Credentials factory is not of type ConfigurationServiceClientCredentialFactory"
      );
    }
    return credentialsFactory;
  }

  private async getRscPermissions(
    context: IEmbedTurnContext
  ): Promise<IPermission[]> {
    if (context.embed.threadType === "personal") {
      throw new Error("Personal scope is not supported for this operation");
    }
    const token = await this.getAppAccessToken(context);
    const graphPhotoEndpoint =
      context.embed.threadType === "chat"
        ? `https://graph.microsoft.com/beta/chats/${context.embed.threadId}/permissionGrants`
        : `https://graph.microsoft.com/beta/teams/${context.embed.threadId}/permissionGrants`;
    const graphRequestParams = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "bearer " + token,
      },
    };

    const response = await fetch(graphPhotoEndpoint, graphRequestParams);
    const json = await response.json();
    if (!response.ok) {
      throw new Error(
        json.error?.message || `HTTP error! status: ${response.status}`
      );
    }
    if (!isIPermissionDetailsResponse(json)) {
      throw new Error("Invalid response from Graph API");
    }
    return json.value
      .filter(
        (permission) =>
          permission.clientAppId === this._credentialsFactory.appId
      )
      .map((permission) => ({
        permissionType: permission.permissionType,
        permission: permission.permission,
      }));
  }

  private async getAppAccessToken(context: IEmbedTurnContext): Promise<string> {
    const credentialsFactory = this._credentialsFactory;

    const url = `https://login.microsoftonline.com/${context.embed.user.tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append("client_id", credentialsFactory.appId!);
    params.append("client_secret", credentialsFactory.password!);
    params.append("scope", "https://graph.microsoft.com/.default");
    params.append("grant_type", "client_credentials");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    if (typeof responseData.access_token !== "string") {
      throw new Error("Invalid response from token endpoint");
    }
    return responseData.access_token;
  }
}
