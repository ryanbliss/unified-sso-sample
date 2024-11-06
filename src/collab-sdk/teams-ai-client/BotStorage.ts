import { isIBotInteropGetValuesRequestResponse, isIBotInteropGetValuesRequestResponseData } from "../shared/request-types";
import { BotStorageScope } from "./BotStorageScope";
import { IBotInteropConfig } from "./client-bot-interop-types";
import { BotInteropNetworkClient } from "./internals/BotInteropNetworkClient";

export class BotStorage {
  private _networkClient: BotInteropNetworkClient;
  public readonly user: BotStorageScope;
  public readonly conversation: BotStorageScope;

  constructor(networkClient: BotInteropNetworkClient) {
    this._networkClient = networkClient;
    this.user = new BotStorageScope(this._networkClient, "user");
    this.conversation = new BotStorageScope(
      this._networkClient,
      "conversation"
    );
  }

  public get configuration(): IBotInteropConfig | undefined {
    return this._networkClient.configuration;
  }

  public set configuration(config: IBotInteropConfig | undefined) {
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

    const response = await this._networkClient.request<unknown>(
      this.configuration.endpoint,
      requestData
    );
    if (!isIBotInteropGetValuesRequestResponse(response)) {
      throw new Error("Unexpected response from get-values request");
    }
    const values = response.data;
    this.user.internalUpdateValues(values.user);
    this.conversation.internalUpdateValues(values.conversation);
  }
}
