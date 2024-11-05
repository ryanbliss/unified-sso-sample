import * as teamsJs from "@microsoft/teams-js";
import { IBotInteropConfig } from "./client-bot-interop-types";
import { Conversation } from "./Conversation";
import { Configuration } from "@azure/msal-browser";
import { Authentication } from "./Authentication";
import { Host } from "./Host";
import { User } from "./User";

export class Application {
    protected teamsJsContext: teamsJs.app.Context;
    public readonly conversation: Conversation;
    public readonly authentication: Authentication;
    public readonly host: Host;
    public readonly user: User;

    constructor(teamsJsContext: teamsJs.app.Context, botInteropConfig?: IBotInteropConfig, entraConfiguration?: Configuration) {
        this.teamsJsContext = teamsJsContext;
        this.conversation = new Conversation(this, botInteropConfig);
        this.authentication = new Authentication(teamsJsContext, entraConfiguration);
        this.host = new Host(teamsJsContext);
        this.user = new User(teamsJsContext);
    }
}
