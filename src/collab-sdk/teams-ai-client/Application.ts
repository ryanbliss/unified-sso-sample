import * as teamsJs from "@microsoft/teams-js";
import { IAppServerConfig } from "./client-bot-interop-types";
import { Conversation } from "./Conversation";
import { Authentication } from "./Authentication";
import { Host } from "./Host";
import { User } from "./User";
import { AppServerNetworkClient } from "./internals/AppServerNetworkClient";
import { Client as GraphClient } from "@microsoft/microsoft-graph-client";
import { IEntraConfiguration } from "./EntraAuthentication-types";

export class Application {
  protected teamsJsContext: teamsJs.app.Context;
  public readonly conversation: Conversation;
  public readonly authentication: Authentication;
  public readonly host: Host;
  public readonly user: User;
  public readonly graph: GraphClient;

  private _networkClient: AppServerNetworkClient;

  public get serverConfiguration(): IAppServerConfig | undefined {
    return this._networkClient.configuration;
  }

  public set serverConfiguration(config: IAppServerConfig | undefined) {
    this._networkClient.configuration = config;
  }

  constructor(
    teamsJsContext: teamsJs.app.Context,
    serverConfig?: IAppServerConfig,
    entraConfiguration?: IEntraConfiguration
  ) {
    this.teamsJsContext = teamsJsContext;
    this._networkClient = new AppServerNetworkClient(this, serverConfig);
    this.conversation = new Conversation(this, this._networkClient);
    this.authentication = new Authentication(
      teamsJsContext,
      entraConfiguration
    );
    this.host = new Host(teamsJsContext);
    this.user = new User(teamsJsContext);
    this.graph = GraphClient.init({
      authProvider: async (callback) => {
        try {
          const token = await this.authentication.entra.acquireToken();
          callback(null, token);
        } catch (error) {
          callback(error, null);
        }
      },
    });
  }
}
