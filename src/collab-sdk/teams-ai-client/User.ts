import * as teamsJs from "@microsoft/teams-js";
export class User {
  private teamsJsContext: teamsJs.app.Context;

  constructor(teamsJsContext: teamsJs.app.Context) {
    this.teamsJsContext = teamsJsContext;
  }

  public get id(): string | undefined {
    return this.teamsJsContext.user?.id;
  }

  public get displayName(): string | undefined {
    return this.teamsJsContext.user?.displayName;
  }

  public get isCallingAllowed(): boolean | undefined {
    return this.teamsJsContext.user?.isCallingAllowed;
  }

  public get isPSTNCallingAllowed(): boolean | undefined {
    return this.teamsJsContext.user?.isPSTNCallingAllowed;
  }

  public get licenseType(): string | undefined {
    return this.teamsJsContext.user?.licenseType;
  }

  public get loginHint(): string | undefined {
    return this.teamsJsContext.user?.loginHint;
  }

  public get userPrincipalName(): string | undefined {
    return this.teamsJsContext.user?.userPrincipalName;
  }

  public get tenant(): teamsJs.app.TenantInfo | undefined {
    return this.teamsJsContext.user?.tenant;
  }
}
