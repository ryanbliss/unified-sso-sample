import {
  IBotInteropConfig,
  isIBotInteropAuthCookie,
  isIBotInteropAuthHeader,
  isIBotInteropEntraAuth,
} from "../client-bot-interop-types";
import { Conversation } from "../Conversation";
import { Application } from "../Application";
import { AuthenticationResult } from "@azure/msal-browser";
import { IBotInteropRequestData } from "@/collab-sdk/shared/request-types";

export class BotInteropNetworkClient {
  private application: Application;
  private _configuration?: IBotInteropConfig;
  constructor(application: Application, config?: IBotInteropConfig) {
    this.application = application;
    this._configuration = config;
  }

  private get conversation(): Conversation {
    return this.application.conversation;
  }

  public get configuration(): IBotInteropConfig | undefined {
    return this._configuration;
  }

  public set configuration(config: IBotInteropConfig | undefined) {
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
    let entraResult: AuthenticationResult | null = null;
    const tokenRequest = {
      scopes: [
        "https://graph.microsoft.com/profile",
        "https://graph.microsoft.com/openid",
      ],
      account:
        this.application.authentication.entra.client.getActiveAccount() ??
        undefined,
    };
    try {
      entraResult =
        await this.application.authentication.entra.client.acquireTokenSilent(
          tokenRequest
        );
    } catch (error) {
      console.error(error);
    }
    if (!entraResult) {
      entraResult =
        await this.application.authentication.entra.client.acquireTokenPopup(
          tokenRequest
        );
    }

    const { authentication } = this._configuration;

    if (isIBotInteropEntraAuth(authentication)) {
      return {
        "authorization-type": `EntraAuth`,
        "entra-authorization": `Bearer ${entraResult.accessToken}`,
      };
    }
    if (isIBotInteropAuthCookie(authentication)) {
      return {
        "authorization-type": `Cookie`,
        AuthCookieKey: authentication.cookieKey,
        "entra-authorization": `Bearer ${entraResult.accessToken}`,
      };
    }
    if (isIBotInteropAuthHeader(authentication)) {
      return {
        "authorization-type": `Header`,
        Authorization: authentication.headerValue,
        "entra-authorization": `Bearer ${entraResult.accessToken}`,
      };
    }
    throw new Error("Unexpected `configuration.authentication` format.");
  }

  public async request<TResponse extends any = unknown>(
    url: string,
    data: Omit<IBotInteropRequestData, "threadId">
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
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData: { data: TResponse } = await response.json();
      return responseData.data;
    } catch (error) {
      console.error("Error making POST request:", error);
      throw error;
    }
  }
}
