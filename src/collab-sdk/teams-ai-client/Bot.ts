import { Application } from "./Application";
import { BotStorage } from "./BotStorage";
import { IBotInteropConfig } from "./client-bot-interop-types";
import { BotInteropNetworkClient } from "./internals/BotInteropNetworkClient";
import { isTeamsPagedMembersResult, TeamsPagedMembersResult } from "./roster-types";

export class Bot {
  private application: Application;
  private _networkClient: BotInteropNetworkClient;
  public readonly storage: BotStorage;
  constructor(application: Application, config?: IBotInteropConfig) {
    this.application = application;
    this._networkClient = new BotInteropNetworkClient(application, config);
    this.storage = new BotStorage(this._networkClient);
  }

  public get configuration(): IBotInteropConfig | undefined {
    return this._networkClient.configuration;
  }

  public set configuration(config: IBotInteropConfig | undefined) {
    this._networkClient.configuration = config;
  }

  public async triggerAction<
    TData extends any = unknown,
    TResponse extends any = unknown
  >(type: string, data: TData): Promise<TResponse> {
    if (!this.configuration) {
      throw new Error("Thread.triggerAction: Bot config not set");
    }

    const requestData = {
      type: "action",
      action: {
        type,
        customData: data,
      },
    };

    return await this._networkClient.request<TResponse>(
      this.configuration.endpoint,
      requestData
    );
  }

  public async getPagedRoster(continuationToken?: string): Promise<TeamsPagedMembersResult> {
    if (!this.configuration) {
      throw new Error("Thread.getRoster: bot config not set");
    }

    const requestData = {
      type: "get-paged-roster",
      continuationToken,
    };

    const response = await this._networkClient.request<TeamsPagedMembersResult>(
      this.configuration.endpoint,
      requestData
    );
    if (!isTeamsPagedMembersResult(response)) {
      throw new Error(`Thread.getRoster: Unexpected response from get-paged-roster request, ${response}`);
    }
    return response;
  }
}
