import { IBotInteropConfig } from "./client-bot-interop-types";
import { BotInteropNetworkClient } from "./internals/BotInteropNetworkClient";

export class BotStorage {
  private _networkClient: BotInteropNetworkClient;
  private _values: Record<string, any> = {};
  constructor(networkClient: BotInteropNetworkClient) {
    this._networkClient = networkClient;
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

  public get<TData extends any = unknown>(
    key: string,
    typeGuard?: (value: any) => value is TData
  ): TData {
    const value = this._values[key];
    if (typeGuard && !typeGuard(value)) {
      throw new Error("Value does not match the expected type");
    }
    return this._values[key];
  }

  public async set<TData extends any = unknown>(key: string, value: TData) {
    if (!this.configuration) {
      throw new Error("BotInterop config not set");
    }

    const requestData = {
      type: "set-value",
      key,
      value,
    };

    return await this._networkClient.request<void>(
      this.configuration.endpoint,
      requestData
    );
  }

  private async getLatestValues() {
    if (!this.configuration) {
      throw new Error("BotInterop config not set");
    }

    const requestData = {
      type: "get-values",
    };

    const values = await this._networkClient.request<unknown>(
      this.configuration.endpoint,
      requestData
    );
    if (values === null || typeof values !== "object") {
      throw new Error("Unexpected response from get-values request");
    }
    this._values = values;
  }
}
