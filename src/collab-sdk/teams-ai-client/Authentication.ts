import * as teamsJs from "@microsoft/teams-js";
import { EntraAuthentication } from "./EntraAuthentication";
import { Configuration } from "@azure/msal-browser";

export class Authentication {
  private teamsJsContext: teamsJs.app.Context;
  public readonly entra: EntraAuthentication;
  constructor(
    teamsJsContext: teamsJs.app.Context,
    entraConfiguration?: Configuration
  ) {
    this.teamsJsContext = teamsJsContext;
    this.entra = new EntraAuthentication(teamsJsContext, entraConfiguration);
  }

  public async authenticate(
    authenticateParameters: teamsJs.authentication.AuthenticatePopUpParameters
  ): Promise<string> {
    return await teamsJs.authentication.authenticate(authenticateParameters);
  }

  public notifySuccess(result?: string): void {
    return teamsJs.authentication.notifySuccess(result);
  }

  public notifyFailure(result?: string): void {
    return teamsJs.authentication.notifyFailure(result);
  }
}
