import { TBotStorageScopeType } from "../shared/request-types";
import { AppServerNetworkClient } from "./internals/AppServerNetworkClient";
import { IEvent, TypedEventEmitter } from "./internals/TypedEventEmitter";

export interface IBotStorageScopeEvents extends IEvent {
  /**
   * Event listener for when a value changed
   * @param event update
   * @param listener listener function
   * @param listener.key the key that changed
   * @param listener.value the new value
   */
  (event: "valueChanged", listener: (key: string, value: any) => void): void;
}

export class BotStorageScope extends TypedEventEmitter<IBotStorageScopeEvents> {
  private _networkClient: AppServerNetworkClient;
  private _values: Record<string, any> = {};
  private _scope: TBotStorageScopeType;
  constructor(
    networkClient: AppServerNetworkClient,
    scope: TBotStorageScopeType
  ) {
    super();
    this._networkClient = networkClient;
    this._scope = scope;
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
    if (!this._networkClient.configuration) {
      throw new Error("BotStorage config not set");
    }

    const requestData = {
      type: "set-value",
      scope: this._scope,
      key,
      value,
    };

    await this._networkClient.request<void>(
      this._networkClient.configuration.endpoint,
      requestData
    );
    this._values[key] = value;
    this.emit("valueChanged", key, value);
  }

  /**
   * @hidden
   */
  public async internalUpdateValues(values: Record<string, any>) {
    const oldValues = this._values;
    this._values = values;
    // TODO: Make a more performant implementation where the server tells the client which values changed
    Object.entries(values).forEach(([key, value]) => {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(value)) {
        this.emit("valueChanged", key, value);
      }
    });
  }
}
