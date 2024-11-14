import { ApplicationOptions, TurnState } from "@microsoft/teams-ai";
import {
  ConfigurationServiceClientCredentialFactory,
  TeamsInfo,
  TurnContext,
} from "botbuilder";
import { EmbedStorage } from "./EmbedStorage";
import { IConversationContext, IEmbedTurnContext } from "./turn-context-extended";
import {
  IPermission,
  isIBotInteropActionRequestData,
  isIGetGraphMembersData,
  isIBotInteropGetInstalledRscPermissionsData,
  isIBotInteropGetRosterRequestData,
  isIBotInteropGetValuesRequestData,
  isIBotInteropSetValueRequestData,
  isIGetGraphMemberData,
} from "../shared";
import { getRscPermissions } from "./utils/app-installations";
import { getGraphMember, getGraphMembers } from "./utils/getGraphMembers";
import { getAppAccessToken } from "./utils/getAppAccessToken";

export class Embed<TState extends TurnState = TurnState> {
  private _options: ApplicationOptions<TState>;
  public readonly storage: EmbedStorage<TState>;

  constructor(options: ApplicationOptions<TState>) {
    this._options = options;
    this.storage = new EmbedStorage(options);
  }

  private handlers: Map<
    string,
    (context: IConversationContext, state: TState, data: any) => Promise<any>
  > = new Map();

  private get _credentialsFactory(): ConfigurationServiceClientCredentialFactory {
    const credentialsFactory = this._options.adapter?.credentialsFactory;
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
      context: IConversationContext,
      state: TState,
      data: TActionPayload
    ) => Promise<TResponseType>
  ) {
    this.handlers.set(type, handler);
  }

  /**
   * @hidden
   */
  private async processAction(type: string, context: IConversationContext, data: any) {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler for action type "${type}"`);
    }
    const { storage, turnStateFactory } = this._options;
    const state = turnStateFactory();
    await state.load(context, storage);
    return await handler(context, state, data);
  }

  /**
   * @hidden
   */
  public async run(turnContext: IEmbedTurnContext): Promise<boolean> {
    // First, check to see if user is actually a member of this conversation
    try {
      await TeamsInfo.getMember(
        turnContext,
        turnContext.embed.user.aadObjectId
      );
    } catch (err) {
      // TODO: check error codes, not all errors are likely to be "Unauthorized"
      console.error(err);
      turnContext.embed.onEmbedFailure(401, "Unauthorized");
      return false;
    }
    if (isIBotInteropActionRequestData(turnContext.embed)) {
      try {
        const response = await this.processAction(
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
        const response = await this.storage.processGetValues(turnContext);
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
        await this.storage.processSetValue(
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
    } else if (isIBotInteropGetInstalledRscPermissionsData(turnContext.embed)) {
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
    } else if (isIGetGraphMembersData(turnContext.embed)) {
      try {
        if (turnContext.embed.threadType === "personal") {
          throw new Error("Personal scope is not supported for this operation");
        }
        const token = await this.getAppAccessToken(turnContext);
        if (!turnContext.embed.subtype) {
          throw new Error("`subtype` is required to get members");
        }
        const roster = await getGraphMembers(
          token,
          turnContext.embed.subtype,
          turnContext.embed.threadId,
          turnContext.embed.teamId
        );
        turnContext.embed.onEmbedSuccess(roster);
      } catch (err) {
        console.error(err);
        const message = (err as any)?.message;
        turnContext.embed.onEmbedFailure(
          500,
          message ?? "Unknown error, check server logs for more details"
        );
      }
    } else if (isIGetGraphMemberData(turnContext.embed)) {
      try {
        if (turnContext.embed.threadType === "personal") {
          throw new Error("Personal scope is not supported for this operation");
        }
        const token = await this.getAppAccessToken(turnContext);
        if (!turnContext.embed.subtype) {
          throw new Error("`subtype` is required to get member");
        }
        const member = await getGraphMember(
          token,
          turnContext.embed.subtype,
          turnContext.embed.threadId,
          turnContext.embed.userAadObjectId,
          turnContext.embed.teamId
        );
        turnContext.embed.onEmbedSuccess(member);
      } catch (err) {
        console.error(err);
        const message = (err as any)?.message;
        turnContext.embed.onEmbedFailure(
          500,
          message ?? "Unknown error, check server logs for more details"
        );
      }
    } else {
      turnContext.embed.onEmbedFailure(500, "Invalid request type");
    }
    return true;
  }

  private async getRscPermissions(
    context: IEmbedTurnContext
  ): Promise<IPermission[]> {
    if (context.embed.threadType === "personal") {
      throw new Error("Personal scope is not supported for this operation");
    }
    const token = await this.getAppAccessToken(context);
    return getRscPermissions(
      token,
      context.embed.threadType,
      context.embed.threadType === "chat"
        ? context.embed.threadId
        : context.embed.teamId!,
      this._credentialsFactory.appId!
    );
  }

  private async getAppAccessToken(context: IEmbedTurnContext): Promise<string> {
    const credentialsFactory = this._credentialsFactory;

    return await getAppAccessToken(
      context.conversation.tenantId,
      credentialsFactory.appId!,
      credentialsFactory.password!
    );
  }
}
