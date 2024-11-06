import { TeamsAdapter as TeamsAdapterBase } from "@microsoft/teams-ai";
import {
  AuthenticationConfiguration,
  ConnectorClientOptions,
  ServiceClientCredentialsFactory,
} from "botframework-connector";
import {
  ConfigurationServiceClientCredentialFactory,
  Request,
  Response,
  StatusCodes,
  TurnContext,
} from "botbuilder";
import { INodeSocket, INodeBuffer } from "botframework-streaming";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { decodeMSALToken } from "@/server/utils/msal-token-utils";
import { findReference } from "@/server/database/conversation-references";
import { isIBotInteropRequestData } from "../shared/request-types";

const USER_AGENT = `teamsai-js/1.1.1`;

export class TeamsAdapter extends TeamsAdapterBase {
  constructor(
    botFrameworkAuthConfig?:
      | {
          MicrosoftAppId?: string | undefined;
          MicrosoftAppPassword?: string | undefined;
          MicrosoftAppTenantId?: string | undefined;
          OAuthApiEndpoint?: string | undefined;
          BotOpenIdMetadata?: string | undefined;
          ChannelService?: string | undefined;
          ValidateAuthority?: string | boolean | undefined;
          ToChannelFromBotLoginUrl?: string | undefined;
          ToChannelFromBotOAuthScope?: string | undefined;
          ToBotFromChannelTokenIssuer?: string | undefined;
          OAuthUrl?: string | undefined;
          ToBotFromChannelOpenIdMetadataUrl?: string | undefined;
          ToBotFromEmulatorOpenIdMetadataUrl?: string | undefined;
          CallerId?: string | undefined;
          CertificateThumbprint?: string | undefined;
          CertificatePrivateKey?: string | undefined;
        }
      | undefined,
    credentialsFactory?: ServiceClientCredentialsFactory,
    authConfiguration?: AuthenticationConfiguration,
    connectorClientOptions?: ConnectorClientOptions
  ) {
    super(
      botFrameworkAuthConfig,
      credentialsFactory,
      authConfiguration,
      connectorClientOptions
    );
  }

  override async process(
    req: Request,
    resOrSocket: Response | INodeSocket,
    logicOrHead: ((context: TurnContext) => Promise<void>) | INodeBuffer,
    maybeLogic?: (context: TurnContext) => Promise<void>
  ): Promise<void> {
    const authType = req.headers[""Authorization-Type""];
    if (
      authType &&
      isIBotInteropRequestData(req.body) &&
      typeof logicOrHead === "function"
    ) {
      // We intercept the behavior for handling client-side requests
      const threadId = req.body.threadId;
      const entraToken = req.headers[""Entra-Authorization""];
      if (
        !(
          this.credentialsFactory instanceof
          ConfigurationServiceClientCredentialFactory
        )
      ) {
        throw new Error(
          "Credentials factory is not of type ConfigurationServiceClientCredentialFactory"
        );
      }
      if (typeof entraToken === "string") {
        const tokenPayload = decodeMSALToken(entraToken);
        // TODO: validate token
        const { oid } = tokenPayload;
        const conversationReference = await findReference(threadId ?? oid);
        await this.continueConversationAsync(
          this.credentialsFactory.appId!,
          conversationReference,
          async (context: TurnContext) => {
            const end = (status: StatusCodes, body?: unknown) => {
              if (isResponse(resOrSocket)) {
                resOrSocket.status(status);
                if (body) {
                  resOrSocket.send(body);
                }
                resOrSocket.end();
              } else {
                throw new Error("Not implemented socket scenario");
              }
            };

            (context as any).embed = req.body;
            (context as any).onEmbedSuccess = (data: any) => {
              end(200, data);
            };
            (context as any).onEmbedFailure = (
              statusCode: StatusCodes,
              message: string
            ) => {
              end(statusCode, {
                error: message,
              });
            };

            await logicOrHead(context);
          }
        );
        return;
      }
    }
    if ("header" in resOrSocket && typeof logicOrHead === "function") {
      resOrSocket.header("User-Agent", USER_AGENT);
      return super.process(req, resOrSocket, logicOrHead);
    }

    if (
      "connecting" in resOrSocket &&
      typeof logicOrHead !== "function" &&
      !!maybeLogic
    ) {
      return super.process(req, resOrSocket, logicOrHead, maybeLogic);
    }
  }
}

function isResponse(res: Response | INodeSocket): res is Response {
  return typeof (res as any).send === "function";
}
