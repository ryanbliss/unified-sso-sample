import { TActivityFeedTopicData } from "./utils/activity-notifications";
import { getTeamsAppInstallation } from "./utils/app-installations";

export interface ICommonDependencies {
  appId: string;
}

export abstract class NotificationTopicFactory<
  TDependencies extends ICommonDependencies
> {
  private _dependencies: TDependencies | undefined;

  protected get dependencies(): TDependencies {
    if (!this._dependencies) {
      throw new Error("Dependencies not set");
    }
    return this._dependencies;
  }

  /**
   * @hidden
   * @internal
   */
  public setDependencies(dependencies: TDependencies): void {
    this._dependencies = dependencies;
  }

  /**
   * @hidden
   * @internal
   */
  abstract toTopic(): Promise<TActivityFeedTopicData>;
}

export interface IOpenPersonalAppDependencies extends ICommonDependencies {
  token: string;
  userId: string;
}

export class OpenPersonalAppTopic extends NotificationTopicFactory<IOpenPersonalAppDependencies> {
  constructor(private config?: IPersonalAppDeepLinkConfiguration) {
    super();
  }
  /**
   * @hidden
   */
  async toTopic(): Promise<TActivityFeedTopicData> {
    const app = await getTeamsAppInstallation(
      this.dependencies.token,
      "personal",
      this.dependencies.userId,
      this.dependencies.appId
    );
    if (!this.config) {
      return {
        source: "entityUrl",
        value: `https://graph.microsoft.com/v1.0/users/${this.dependencies.userId}/teamwork/installedApps/${app.id}`,
      };
    }
    const encodedWebUrl = encodeURIComponent(this.config.fallbackWebUrl);
    const encodedContext = encodeURIComponent(
      JSON.stringify({ subEntityId: this.config.data })
    );
    const webUrl =
      `https://teams.microsoft.com/l/entity/${app.teamsAppDefinition.teamsAppId}/${this.config.entityId}?webUrl=` +
      encodedWebUrl +
      "&context=" +
      encodedContext;
    return {
      source: "text",
      value: this.config.label,
      webUrl,
    };
  }
}

export interface IPersonalAppDeepLinkConfiguration {
  entityId: string;
  fallbackWebUrl: string;
  label: string;
  data?: any;
}

export class NotificationTopics {
  static OpenPersonalApp(
    config?: IPersonalAppDeepLinkConfiguration
  ): OpenPersonalAppTopic {
    return new OpenPersonalAppTopic(config);
  }
}
