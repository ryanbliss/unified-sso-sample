import {
  ConfigurationServiceClientCredentialFactory,
  TeamsInfo,
  TurnContext,
} from "botbuilder";
import { Application } from "./Application";
import { TeamsAdapter, TurnState } from "@microsoft/teams-ai";
import { IGraphMember, IPermission, TConversationType } from "../shared";
import { getRscPermissions } from "./utils/getRscPermissions";
import { getAppAccessToken } from "./utils/getAppAccessToken";
import { getGraphMember, getGraphMembers } from "./utils/getGraphMembers";

export class Conversation<TState extends TurnState = TurnState> {
  private application: Application<TState>;
  private context: TurnContext;
  constructor(application: Application<TState>, context: TurnContext) {
    this.application = application;
    this.context = context;
  }

  public get id(): string {
    if (this.type === "channel") {
        if (!this.context.activity.channelData) {
            throw new Error("Unexpected Error: missing 'activity.channelData' when conversation type is 'channel'");
        }
        const channelId = this.context.activity.channelData.teamsChannelId;
        if (typeof channelId !== "string") {
            throw new Error("Unexpected Error: 'activity.channelData.teamsChannelId' is not a string");
        }
        return channelId;
    }
    // TODO: polyfill threadId when in personal scope, since id in TurnContext is encrypted
    return this.context.activity.conversation.id;
  }

  /**
   * The ID of the conversation thread.
   * @remarks
   * In channels, replies to posts happen in sub-threads.
   * This ID identifies the specific thread in a channel.
   * In 1:1 chats and group chats, this ID is the same as {@link id}
   */
  public get threadId(): string {
    return this.context.activity.conversation.id;
  }

  // TODO: replace return type with something more strongly typed
  public get type(): TConversationType {
    if (this.context.activity.conversation.conversationType === "groupChat") {
      return "chat";
    }
    if (this.context.activity.conversation.conversationType === "channel") {
      return "channel";
    }
    if (this.context.activity.conversation.conversationType === "personal") {
      return "personal";
    }
    throw new Error("Unknown conversation type");
  }

  /**
   * Indicates whether the conversation contains more than two participants at the time the
   * activity was generated.
   */
  public get isGroup(): boolean {
    return this.context.activity.conversation.isGroup;
  }
  /**
   * This conversation's tenant ID
   */
  public get tenantId(): string {
    if (!this.context.activity.conversation.tenantId) {
      throw new Error("Tenant ID not found in conversation");
    }
    return this.context.activity.conversation.tenantId;
  }
  /**
   * Display friendly name
   */
  public get name(): string {
    throw new Error("Not implemented");
  }
  /**
   * This account's object ID within Azure Active Directory (AAD)
   */
  public get aadObjectId(): string | undefined {
    throw new Error(
      "Not implemented, teams-js only exposes local user tenantId"
    );
  }

  private get _credentialsFactory(): ConfigurationServiceClientCredentialFactory {
    const adapter = this.context.adapter;
    if (!(adapter instanceof TeamsAdapter)) {
      throw new Error("Adapter is not an instance of TeamsAdapter");
    }
    if (
      !(
        adapter.credentialsFactory instanceof
        ConfigurationServiceClientCredentialFactory
      )
    ) {
      throw new Error(
        "Credentials factory is not of type ConfigurationServiceClientCredentialFactory"
      );
    }
    return adapter.credentialsFactory;
  }

  public async getEnabledRscPermissions(): Promise<IPermission[]> {
    if (this.context.activity.conversation.conversationType === "personal") {
      throw new Error("Personal scope is not supported for this operation");
    }
    const token = await this.getAppAccessToken();
    const threadType =
      this.context.activity.conversation.conversationType === "groupChat"
        ? "chat"
        : "channel";

    return getRscPermissions(
      token,
      threadType,
      threadType === "chat" ? this.id : await this.getGroupId(),
      this._credentialsFactory.appId!
    );
  }

  public async getMembers(): Promise<IGraphMember[]> {
    if (this.context.activity.conversation.conversationType === "personal") {
      throw new Error(
        "Conversation.getRoster: Cannot get roster for personal chat"
      );
    }
    const threadType = this.type;
    const token = await this.getAppAccessToken();
    const response = await getGraphMembers(
      token,
      // TODO: replace "team" with "channel" when Teams supports channel RSC
      threadType === "chat" ? "chat" : "team",
      this.id,
      threadType === "chat" ? undefined : await this.getGroupId()
    );
    return response.value;
  }

  /**
   * Get member details of a user in a conversation using Graph.
   *
   * @param userId user's aadObjectId
   * @returns user's graph member details
   */
  public async getMember(userId: string): Promise<IGraphMember> {
    if (this.context.activity.conversation.conversationType === "personal") {
      throw new Error(
        "Conversation.getRoster: Cannot get roster for personal chat"
      );
    }
    const threadType = this.type;
    const token = await this.getAppAccessToken();
    const response = await getGraphMember(
      token,
      // TODO: replace "team" with "channel" when Teams supports channel RSC
      threadType === "chat" ? "chat" : "team",
      this.id,
      userId,
      threadType === "chat" ? undefined : await this.getGroupId()
    );
    return response;
  }

  private async getGroupId(): Promise<string> {
    // Gets the details for the given team id.
    const teamDetails = await TeamsInfo.getTeamDetails(this.context);
    if (!teamDetails?.aadGroupId) {
        throw new Error("Team details not found");
    }
    return teamDetails.aadGroupId;
  }

  private async getAppAccessToken(): Promise<string> {
    const credentialsFactory = this._credentialsFactory;
    return await getAppAccessToken(
      this.tenantId,
      credentialsFactory.appId!,
      credentialsFactory.password!
    );
  }
}
