import { isIBotInteropGetValuesRequestResponseData } from "../shared";
import { BotStorageScope } from "./BotStorageScope";
import { IAppServerConfig } from "./client-bot-interop-types";
import { AppServerNetworkClient } from "./internals/AppServerNetworkClient";

export class BotStorage {
  private _networkClient: AppServerNetworkClient;
  public readonly user: BotStorageScope;
  public readonly conversation: BotStorageScope;

  constructor(networkClient: AppServerNetworkClient) {
    this._networkClient = networkClient;
    this.user = new BotStorageScope(this._networkClient, "user");
    this.conversation = new BotStorageScope(
      this._networkClient,
      "conversation"
    );
  }

  public get configuration(): IAppServerConfig | undefined {
    return this._networkClient.configuration;
  }

  public set configuration(config: IAppServerConfig | undefined) {
    this._networkClient.configuration = config;
  }

  public async initialize() {
    return await this.getLatestValues();
  }

  private async getLatestValues() {
    if (!this.configuration) {
      throw new Error("BotStorage config not set");
    }
    const requestData = {
      type: "get-values",
    };

    const values = await this._networkClient.request<unknown>(
      this.configuration.endpoint,
      requestData
    );
    if (!isIBotInteropGetValuesRequestResponseData(values)) {
      throw new Error(`Unexpected response from get-values request, ${values}`);
    }
    this.user.internalUpdateValues(values.user);
    this.conversation.internalUpdateValues(values.conversation);
  }
}
