import { Application } from "./Application";
import { BotStorage } from "./BotStorage";
import { IBotInteropConfig } from "./client-bot-interop-types";
import { BotInteropNetworkClient } from "./internals/BotInteropNetworkClient";

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
      throw new Error("Thread.postAction: BotInterop config not set");
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
}
