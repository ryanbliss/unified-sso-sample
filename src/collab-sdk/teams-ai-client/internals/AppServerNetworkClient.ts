import {
  IAppServerConfig,
  isIBotInteropAuthCookie,
  isIBotInteropAuthHeader,
  isIBotInteropEntraAuth,
} from "../client-bot-interop-types";
import { Application } from "../Application";
import {
  TBotInteropRequestBase,
  TConversationType,
} from "@/collab-sdk/shared/request-types";

export interface IConversationMetadata {
  id: string | undefined;
  type: TConversationType;
  team?: {
    id: string;
  };
}

export class AppServerNetworkClient {
  private application: Application;
  private _conversation: IConversationMetadata | undefined;
  private _configuration?: IAppServerConfig;
  constructor(application: Application, config?: IAppServerConfig) {
    this.application = application;
    this._configuration = config;
  }

  public get conversation(): IConversationMetadata {
    if (!this._conversation) {
      throw new Error("Conversation not set");
    }
    return this._conversation;
  }

  public set conversation(conversation: IConversationMetadata) {
    this._conversation = conversation;
  }

  public get configuration(): IAppServerConfig | undefined {
    return this._configuration;
  }

  public set configuration(config: IAppServerConfig | undefined) {
    this._configuration = config;
  }

  private async getRequestHeaders(): Promise<HeadersInit> {
    if (!this._configuration) {
      throw new Error("BotInterop config not set");
    }
    if (!this.application.authentication.entra.isInitialized) {
      throw new Error(
        "Entra authentication not initialized, please call `Application.authentication.entra.initialize` before making requests"
      );
    }
    const entraToken: string =
      await this.application.authentication.entra.acquireToken();

    const { authentication } = this._configuration;

    if (isIBotInteropEntraAuth(authentication)) {
      return {
        "authorization-type": `EntraAuth`,
        "entra-authorization": `Bearer ${entraToken}`,
      };
    }
    if (isIBotInteropAuthCookie(authentication)) {
      return {
        "authorization-type": `Cookie`,
        AuthCookieKey: authentication.cookieKey,
        "entra-authorization": `Bearer ${entraToken}`,
      };
    }
    if (isIBotInteropAuthHeader(authentication)) {
      return {
        "authorization-type": `Header`,
        Authorization: authentication.headerValue,
        "entra-authorization": `Bearer ${entraToken}`,
      };
    }
    throw new Error("Unexpected `configuration.authentication` format.");
  }

  public async request<TResponse extends any = unknown>(
    url: string,
    data: TBotInteropRequestBase
  ): Promise<TResponse> {
    if (!this.conversation.id) {
      throw new Error(
        "BotInteropNetworkRequest.request: Only supported in a Teams context with a valid thread"
      );
    }
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await this.getRequestHeaders()),
        },
        body: JSON.stringify({
          ...data,
          threadId: this.conversation.id,
          threadType: this.conversation.type,
          teamId: this.conversation.team?.id,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        if (typeof json === "object") {
          if (typeof json.error === "string") {
            throw new Error(json.error);
          }
          throw new Error(JSON.stringify(json));
        }
        throw new Error(
          `An unknown error occurred with status: ${response.status}`
        );
      }

      const responseData: { data: TResponse } = json;
      return responseData.data;
    } catch (error) {
      console.error("Error making POST request:", error);
      throw error;
    }
  }
}
