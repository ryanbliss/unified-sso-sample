import {
  createNestablePublicClientApplication,
  IPublicClientApplication,
  Configuration,
  AccountInfo,
} from "@azure/msal-browser";
import * as teamsJs from "@microsoft/teams-js";

export class EntraAuthentication {
  private teamsJsContext: teamsJs.app.Context;
  public configuration?: Configuration;
  private _client?: IPublicClientApplication;

  constructor(
    teamsJsContext: teamsJs.app.Context,
    entraConfiguration?: Configuration
  ) {
    this.teamsJsContext = teamsJsContext;
    this.configuration = entraConfiguration;
  }

  public get client(): IPublicClientApplication {
    if (!this._client) {
      throw new Error(
        "Entra client not initialized, please call `initialize` before accessing `client`"
      );
    }
    return this._client;
  }

  public get isInitialized(): boolean {
    return this._client !== undefined;
  }

  public async initialize() {
    if (!this.configuration || this._client) return;
    console.log("EntraAuthentication.initialize: Initializing Entra client");
    this._client = await createNestablePublicClientApplication(
      this.configuration
    );
    console.log("EntraAuthentication.initialize: Client initialized");
    let activeAccount: AccountInfo | null = null;
    try {
      activeAccount = this._client.getActiveAccount();
      console.log(
        "EntraAuthentication.initialize: activeAccount",
        activeAccount
      );
    } catch (e) {
      console.error("Error getting active account", e);
    }
    if (activeAccount) return;
    console.log(
      "EntraAuthentication.initialize: Setting active account using teamsJsContext",
      this.teamsJsContext
    );
    const accountFilter = {
      tenantId: this.teamsJsContext.user?.tenant?.id,
      homeAccountId: this.teamsJsContext.user?.id,
      loginHint: this.teamsJsContext.user?.loginHint,
    };
    const accountWithFilter = this._client.getAccount(accountFilter);
    if (!accountWithFilter) {
      console.error(
        "EntraAuthentication.initialize: unable to find account for filter",
        accountFilter
      );
      return;
    }
    this._client.setActiveAccount(accountWithFilter);
  }
}
