import { BotStorage } from "./BotStorage";
import { AppServerNetworkClient } from "./internals/AppServerNetworkClient";
import { isTeamsPagedMembersResult, TeamsPagedMembersResult } from "./roster-types";

export class Bot {
  private _networkClient: AppServerNetworkClient;
  public readonly storage: BotStorage;
  constructor(networkClient: AppServerNetworkClient) {
    this._networkClient = networkClient;
    this.storage = new BotStorage(this._networkClient);
  }

  public async triggerAction<
    TData extends any = unknown,
    TResponse extends any = unknown
  >(type: string, data: TData): Promise<TResponse> {
    if (!this._networkClient.configuration) {
      throw new Error("Thread.triggerAction: server configuration not set");
    }

    const requestData = {
      type: "action",
      action: {
        type,
        customData: data,
      },
    };

    return await this._networkClient.request<TResponse>(
      this._networkClient.configuration.endpoint,
      requestData
    );
  }

  public async getPagedMembers(continuationToken?: string): Promise<TeamsPagedMembersResult> {
    if (!this._networkClient.configuration) {
      throw new Error("Thread.getRoster: bot config not set");
    }

    const requestData = {
      type: "get-paged-roster",
      continuationToken,
    };

    const response = await this._networkClient.request<TeamsPagedMembersResult>(
      this._networkClient.configuration.endpoint,
      requestData
    );
    if (!isTeamsPagedMembersResult(response)) {
      throw new Error(`Thread.getRoster: Unexpected response from get-paged-roster request, ${response}`);
    }
    return response;
  }
}
