import * as teamsJs from "@microsoft/teams-js";
import { EntraAuthentication } from "./EntraAuthentication";
import { IEntraConfiguration } from "./EntraAuthentication-types";

export class Authentication {
  private teamsJsContext: teamsJs.app.Context;
  public readonly entra: EntraAuthentication;
  constructor(
    teamsJsContext: teamsJs.app.Context,
    entraConfiguration?: IEntraConfiguration
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
