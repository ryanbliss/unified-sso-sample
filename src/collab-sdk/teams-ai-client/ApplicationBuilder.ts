import { Application } from "./Application";
import * as teamsJs from "@microsoft/teams-js";
import { IBotInteropConfig } from "./client-bot-interop-types";
import { Configuration } from "@azure/msal-browser";

export class ApplicationBuilder {
  private overrideContext: teamsJs.app.Context | undefined;
  private validMessageOrigins: string[] | undefined;
  private botInteropConfig?: IBotInteropConfig;
  private entraConfiguration?: Configuration;
  public async build(): Promise<Application> {
    await teamsJs.app.initialize(this.validMessageOrigins);
    const context = this.overrideContext ?? (await teamsJs.app.getContext());
    const application = new Application(
      context,
      this.botInteropConfig,
      this.entraConfiguration
    );
    if (this.entraConfiguration) {
      await application.authentication.entra.initialize();
    }
    return application;
  }
  public withHostConfig(config: {
    validMessageOrigins: string[];
  }): ApplicationBuilder {
    this.validMessageOrigins = config.validMessageOrigins;
    return this;
  }
  public withBot(config: IBotInteropConfig): ApplicationBuilder {
    this.botInteropConfig = config;
    return this;
  }
  public withEntraAuthentication(
    configuration: Configuration
  ): ApplicationBuilder {
    this.entraConfiguration = configuration;
    return this;
  }
  public withTestContext(context?: teamsJs.app.Context): ApplicationBuilder {
    this.overrideContext = context;
    return this;
  }
}
