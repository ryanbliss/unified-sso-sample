import {
  ConfigurationServiceClientCredentialFactory,
  TurnContext,
} from "botbuilder";
import { isEmbedTurnContext } from "./turn-context-extended";
import { getAppAccessToken } from "./utils/getAppAccessToken";
import { TeamsAdapter } from "@microsoft/teams-ai";
import {
    IActivityFeedTemplateParameter,
  sendUserActivityFeedNotification,
  TActivityFeedTopic,
} from "./utils/activity-notifications";

export class User {
  private context: TurnContext;

  constructor(context: TurnContext) {
    this.context = context;
  }

  private get _credentialsFactory(): ConfigurationServiceClientCredentialFactory {
    const adapter = this.context.adapter;
    if (!(adapter instanceof TeamsAdapter)) {
      throw new Error("Adapter is not an instance of TeamsAdapter");
    }
    if (
      !(
        adapter.credentialsFactory instanceof
        ConfigurationServiceClientCredentialFactory
      )
    ) {
      throw new Error(
        "Credentials factory is not of type ConfigurationServiceClientCredentialFactory"
      );
    }
    return adapter.credentialsFactory;
  }

  public get id(): string {
    if (isEmbedTurnContext(this.context)) {
      return this.context.embed.user.aadObjectId;
    }
    if (!this.context.activity.from.aadObjectId) {
      throw new Error(
        "User.id not found, which is an unexpected error. Only construct User if teamsJs app.Context.user.id is defined."
      );
    }
    return this.context.activity.from.aadObjectId;
  }

  public get name(): string {
    if (isEmbedTurnContext(this.context)) {
      // TODO: Implement this
      return "NOT IMPLEMENTED";
    }
    return this.context.activity.from.name;
  }

  // TODO: move to interface / class
  public get tenant(): { id: string } {
    if (isEmbedTurnContext(this.context)) {
      // TODO: Implement this
      return { id: this.context.embed.user.tenantId };
    }
    return { id: this.context.activity.conversation.tenantId! };
  }

  public async sendNotification(
    notificationText: string,
    previewText: string,
    topic: TActivityFeedTopic
  ): Promise<void> {
    return await this.sendTemplatedNotification(
        "systemDefault",
        [
          {
            name: "systemDefaultText",
            value: notificationText,
          },
        ],
        previewText,
        topic,
    );
  }

  public async sendTemplatedNotification(
    type: string,
    templateParameters: IActivityFeedTemplateParameter[],
    previewText: string,
    topic: TActivityFeedTopic
  ): Promise<void> {
    const token = await this.getAppAccessToken();
    const credentialsFactory = this._credentialsFactory;
    await sendUserActivityFeedNotification(
      token,
      this.id,
      type,
      previewText,
      templateParameters,
      topic,
      credentialsFactory.appId!
    );
  }

  private async getAppAccessToken(): Promise<string> {
    const credentialsFactory = this._credentialsFactory;
    return await getAppAccessToken(
      this.tenant.id,
      credentialsFactory.appId!,
      credentialsFactory.password!
    );
  }
}
