import * as teamsJs from "@microsoft/teams-js";

export class Page {
  private teamsJsContext: teamsJs.app.Context;

  constructor(teamsJsContext: teamsJs.app.Context) {
    this.teamsJsContext = teamsJsContext;
  }

  public get frameContext(): teamsJs.FrameContexts {
    return this.teamsJsContext.page.frameContext;
  }
}
