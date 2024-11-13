import * as teamsJs from "@microsoft/teams-js";
import { Application } from "./Application";
import { Bot } from "./Bot";
import {
  IGraphMember,
  isIGraphMemberDetailsResponse,
  isTPermissionsList,
  TPermissionList,
  TConversationType,
  isIGraphMember,
} from "../shared";
import { AppServerNetworkClient } from "./internals/AppServerNetworkClient";
import { IGetMembersOptions } from "./Conversation-types";
import { Team } from "./Team";

export class Conversation {
  private application: Application;
  private context: teamsJs.app.Context;
  public readonly bot: Bot;
  public readonly team: Team | undefined;
  private _networkClient: AppServerNetworkClient;
  constructor(
    application: Application,
    teamsJsContext: teamsJs.app.Context,
    networkClient: AppServerNetworkClient
  ) {
    this.application = application;
    this.context = teamsJsContext;
    this._networkClient = networkClient;
    this.bot = new Bot(this._networkClient);
    if (this.context.team) {
      this.team = new Team(this.application, this._networkClient);
    }
  }
  public get id(): string | undefined {
    const knownThreadId = this.context.chat?.id ?? this.context.channel?.id;
    if (!knownThreadId) {
      const userId = this.context.user?.id;
      if (!userId) {
        return undefined;
      }
      if (!this._networkClient.configuration) {
        return undefined;
      }
      // TODO: replace with something better
      return `19:${userId}_${this._networkClient.configuration.id}@unq.gbl.spaces`;
    }
    return knownThreadId;
  }
  // TODO: replace return type with something more strongly typed
  public get type(): TConversationType {
    if (this.context.chat?.id) {
      return "chat";
    }
    if (this.context.channel?.id) {
      return "channel";
    }
    return "personal";
  }

  /**
   * Indicates whether the conversation contains more than two participants at the time the
   * activity was generated.
   */
  public get isGroup(): boolean {
    throw new Error("Not implemented");
  }
  /**
   * This conversation's tenant ID
   */
  public get tenantId(): string {
    throw new Error("Not implemented, teams-js only exposes user tenantId");
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

  /**
   *
   * @param options Optional. Request {@link IGetMembersOptions} options.
   * @param options.requestType Optional. See {@link IGetMembersOptions.requestType} for more details.
   * @returns roster of the conversation
   */
  public async getMembers(
    options?: IGetMembersOptions
  ): Promise<IGraphMember[]> {
    if (this.type === "personal") {
      throw new Error(
        "Conversation.getRoster: Cannot get roster for personal chat"
      );
    }
    let requestType: "server" | "client" | undefined = options?.requestType;

    if (requestType === "server" && !this._networkClient.configuration) {
      throw new Error(
        "Conversation.getRoster: `Application.serverConfiguration` is not set. Set `Application.serverConfiguration` before calling this method. For more information about how to use this API, visit https://aka.ms/TODOPLACEHOLDER"
      );
    } else if (
      requestType === "client" &&
      !this.application.authentication.entra.isInitialized
    ) {
      throw new Error(
        "Conversation.getRoster: `Application.authentication.entra` has not been initialized. Await `Application.authentication.entra.initialize()` before calling this method. For more information about how to use this API, visit https://aka.ms/TODOPLACEHOLDER"
      );
    } else if (!this._networkClient.configuration && !requestType) {
      if (!this.application.authentication.entra.isInitialized) {
        throw new Error(
          "Conversation.getRoster: `Application.serverConfiguration` is not set, nor has `Application.authentication.entra` been initialized. For more information about how to use this API, visit https://aka.ms/TODOPLACEHOLDER"
        );
      }
      requestType = "client";
    } else if (!requestType) {
      requestType = "server";
    }

    // Request via server
    if (requestType === "server") {
      const requestData = {
        type: "get-graph-members",
        // TODO: uncomment when channel RSC permission is added to Teams
        // subtype: this.type,
        // TODO: remove when channel RSC permission is added to Teams
        subtype: this.type === "chat" ? "chat" : "team",
      };

      const response = await this._networkClient.request<any>(
        this._networkClient.configuration!.endpoint,
        requestData
      );
      if (!isIGraphMemberDetailsResponse(response)) {
        throw new Error(
          `Conversation.getRoster: Unexpected response from get-paged-roster request, ${response}`
        );
      }
      return response.value;
    }

    // Request via client
    let endpoint: string;
    if (this.type === "chat") {
      endpoint = `/chats/${this.id}/members`;
    } else if (this.type === "channel") {
      if (!this.team) {
        throw new Error(
          "Conversation.getRoster: Team instance not available for channel, which is unexpected when `Conversation.type` is `channel`"
        );
      }
      endpoint = `/teams/${this.team.id}/channels/${this.id}/members`;
    } else {
      throw new Error("Conversation.getRoster: Unexpected conversation type");
    }
    const response = await this.application.graph.api(endpoint).get();
    if (!isIGraphMemberDetailsResponse(response)) {
      throw new Error(
        `Conversation.getRoster: Unexpected response from get-paged-roster request, ${response}`
      );
    }
    return response.value;
  }

  /**
   * Get a specific member of the conversation.
   *
   * @param userId user's aadObjectId
   * @param options Optional. Request {@link IGetMembersOptions} options.
   * @param options.requestType Optional. See {@link IGetMembersOptions.requestType} for more details.
   * @returns roster of the conversation
   */
  public async getMember(
    userId: string,
    options?: IGetMembersOptions
  ): Promise<IGraphMember> {
    if (this.type === "personal") {
      throw new Error(
        "Conversation.getRoster: Cannot get roster for personal chat"
      );
    }
    let requestType: "server" | "client" | undefined = options?.requestType;

    if (requestType === "server" && !this._networkClient.configuration) {
      throw new Error(
        "Conversation.getRoster: `Application.serverConfiguration` is not set. Set `Application.serverConfiguration` before calling this method. For more information about how to use this API, visit https://aka.ms/TODOPLACEHOLDER"
      );
    } else if (
      requestType === "client" &&
      !this.application.authentication.entra.isInitialized
    ) {
      throw new Error(
        "Conversation.getRoster: `Application.authentication.entra` has not been initialized. Await `Application.authentication.entra.initialize()` before calling this method. For more information about how to use this API, visit https://aka.ms/TODOPLACEHOLDER"
      );
    } else if (!this._networkClient.configuration && !requestType) {
      if (!this.application.authentication.entra.isInitialized) {
        throw new Error(
          "Conversation.getRoster: `Application.serverConfiguration` is not set, nor has `Application.authentication.entra` been initialized. For more information about how to use this API, visit https://aka.ms/TODOPLACEHOLDER"
        );
      }
      requestType = "client";
    } else if (!requestType) {
      requestType = "server";
    }

    // Request via server
    if (requestType === "server") {
      const requestData = {
        type: "get-graph-member",
        // TODO: uncomment when channel RSC permission is added to Teams
        // subtype: this.type,
        // TODO: remove when channel RSC permission is added to Teams
        subtype: this.type === "chat" ? "chat" : "team",
        userAadObjectId: userId,
      };

      const response = await this._networkClient.request<any>(
        this._networkClient.configuration!.endpoint,
        requestData
      );
      if (!isIGraphMember(response)) {
        throw new Error(
          `Conversation.getRoster: Unexpected response from get-paged-roster request, ${response}`
        );
      }
      return response;
    }

    // Request via client
    let endpoint: string;
    if (this.type === "chat") {
      endpoint = `/chats/${this.id}/members?$filter=(microsoft.graph.aadUserConversationMember/userId eq '${userId}')`;
    } else if (this.type === "channel") {
      if (!this.team) {
        throw new Error(
          "Conversation.getRoster: Team instance not available for channel, which is unexpected when `Conversation.type` is `channel`"
        );
      }
      endpoint = `/teams/${this.team.id}/channels/${this.id}/members?$filter=(microsoft.graph.aadUserConversationMember/userId eq '${userId}')`;
    } else {
      throw new Error("Conversation.getRoster: Unexpected conversation type");
    }
    const response = await this.application.graph.api(endpoint).get();
    if (!isIGraphMemberDetailsResponse(response)) {
      throw new Error(
        `Conversation.getRoster: Unexpected response from get-paged-roster request, ${response}`
      );
    }
    if (response["@odata.count"] === 0) {
      throw new Error("User is not a member of the conversation.");
    }
    if (response["@odata.count"] > 1) {
      throw new Error(
        "Unexpected Error: more than one member found for the given aadObjectId"
      );
    }
    return response.value[0];
  }

  public async getEnabledRscPermissions(): Promise<TPermissionList> {
    if (!this._networkClient.configuration) {
      throw new Error("Conversation.getRoster: bot config not set");
    }

    const requestData = {
      type: "get-rsc-permissions",
    };

    const response = await this._networkClient.request<any>(
      this._networkClient.configuration.endpoint,
      requestData
    );
    if (!isTPermissionsList(response)) {
      throw new Error(
        `Conversation.getRoster: Unexpected response from get-paged-roster request, ${response}`
      );
    }
    return response;
  }
}
