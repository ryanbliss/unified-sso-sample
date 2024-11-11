import * as teamsJs from "@microsoft/teams-js";
import { Application } from "./Application";
import { Bot } from "./Bot";
import {
  IGraphMember,
  isIGraphMemberDetailsResponse,
  isTPermissionsList,
  TPermissionList,
  TThreadType,
} from "../shared";
import { AppServerNetworkClient } from "./internals/AppServerNetworkClient";
import { IGetRosterOptions } from "./Conversation-types";

export class Conversation {
  private application: Application;
  public readonly bot: Bot;
  private _networkClient: AppServerNetworkClient;
  constructor(application: Application, networkClient: AppServerNetworkClient) {
    this.application = application;
    this._networkClient = networkClient;
    this.bot = new Bot(this._networkClient);
  }
  private get context(): teamsJs.app.Context {
    // @ts-expect-error using protected property intentionally
    return this.application.teamsJsContext;
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
  public get type(): TThreadType {
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
  public isGroup(): boolean {
    throw new Error("Not implemented");
  }
  /**
   * This conversation's tenant ID
   */
  public tenantId(): boolean {
    throw new Error("Not implemented, teams-js only exposes user tenantId");
  }
  /**
   * Display friendly name
   */
  public name(): string {
    throw new Error("Not implemented");
  }
  /**
   * This account's object ID within Azure Active Directory (AAD)
   */
  public aadObjectId(): string | undefined {
    throw new Error(
      "Not implemented, teams-js only exposes local user tenantId"
    );
  }

  /**
   *
   * @param options Optional. Request {@link IGetRosterOptions} options.
   * @param options.requestType Optional. See {@link IGetRosterOptions.requestType} for more details.
   * @returns
   */
  public async getRoster(options?: IGetRosterOptions): Promise<IGraphMember[]> {
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
        type: "get-graph-roster",
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
    const prefix = this.type === "chat" ? "chats" : "teams";
    const response = await this.application.graph
      .api(`/${prefix}/${this.id}/members`)
      .get();
    if (!isIGraphMemberDetailsResponse(response)) {
      throw new Error(
        `Conversation.getRoster: Unexpected response from get-paged-roster request, ${response}`
      );
    }
    return response.value;
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
