import * as teamsJs from "@microsoft/teams-js";
import { IAppServerConfig } from "./client-bot-interop-types";
import { Conversation } from "./Conversation";
import { Configuration } from "@azure/msal-browser";
import { Authentication } from "./Authentication";
import { Host } from "./Host";
import { User } from "./User";
import { AppServerNetworkClient } from "./internals/AppServerNetworkClient";

export class Application {
    protected teamsJsContext: teamsJs.app.Context;
    public readonly conversation: Conversation;
    public readonly authentication: Authentication;
    public readonly host: Host;
    public readonly user: User;

    private _networkClient: AppServerNetworkClient;

    public get serverConfiguration(): IAppServerConfig | undefined {
        return this._networkClient.configuration;
    }

    public set serverConfiguration(config: IAppServerConfig | undefined) {
        this._networkClient.configuration = config;
    }

    constructor(teamsJsContext: teamsJs.app.Context, serverConfig?: IAppServerConfig, entraConfiguration?: Configuration) {
        this.teamsJsContext = teamsJsContext;
        this._networkClient = new AppServerNetworkClient(this, serverConfig);
        this.conversation = new Conversation(this, this._networkClient);
        this.authentication = new Authentication(teamsJsContext, entraConfiguration);
        this.host = new Host(teamsJsContext);
        this.user = new User(teamsJsContext);
    }
}
