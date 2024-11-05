import * as teamsJs from "@microsoft/teams-js";
import { IEvent, TypedEventEmitter } from "./internals/TypedEventEmitter";
import { Page } from "./Page";

export interface IHostEvents extends IEvent {
  /**
   * Event listener for when a leaf on a node was changed
   * @param event update
   * @param listener listener function
   * @param listener.theme the new theme
   */
  (event: "themeChanged", listener: (theme: string) => void): void;
}

export class Host extends TypedEventEmitter<IHostEvents> {
  public teamsJsContext: teamsJs.app.Context;

  public readonly page: Page;

  public readonly clipboard = teamsJs.clipboard;

  public readonly lifecyle = teamsJs.app.lifecycle;

  constructor(teamsJsContext: teamsJs.app.Context) {
    super();
    this.teamsJsContext = teamsJsContext;
    this.page = new Page(teamsJsContext);
    teamsJs.app.registerOnThemeChangeHandler((theme) => {
        this.teamsJsContext.app.theme = theme;
        this.emit("themeChanged", theme);
    });
  }

  get theme() {
    return this.teamsJsContext.app.theme;
  }

  get locale(): string {
    return this.teamsJsContext.app.locale;
  }

  get sessionId(): string {
    return this.teamsJsContext.app.sessionId;
  }

  get hostInfo(): teamsJs.app.AppHostInfo {
    return this.teamsJsContext.app.host;
  }

  get osLocaleInfo(): teamsJs.LocaleInfo | undefined {
    return this.teamsJsContext.app.osLocaleInfo;
  }

  get iconPositionVertical(): number | undefined {
    return this.teamsJsContext.app.iconPositionVertical;
  }

  get userClickTime(): number | undefined {
    return this.teamsJsContext.app.userClickTime;
  }

  get parentMessageId(): string | undefined {
    return this.teamsJsContext.app.parentMessageId;
  }

  get userFileOpenPreference(): teamsJs.FileOpenPreference | undefined {
    return this.teamsJsContext.app.userFileOpenPreference;
  }

  get appLaunchId(): string | undefined {
    return this.teamsJsContext.app.appLaunchId;
  }

  notifyAppLoaded() {
    return teamsJs.app.notifyAppLoaded();
  }
  notifySuccess() {
    return teamsJs.app.notifySuccess();
  }
  notifyFailure(appInitializationFailedRequest: teamsJs.app.IFailedRequest) {
    return teamsJs.app.notifyFailure(appInitializationFailedRequest);
  }
  notifyExpectedFailure(
    appInitializationFailedRequest: teamsJs.app.IExpectedFailureRequest
  ) {
    return teamsJs.app.notifyExpectedFailure(appInitializationFailedRequest);
  }
  openLink(deepLink: string): Promise<void> {
    return teamsJs.app.openLink(deepLink);
  }

  dispose() {
    this.removeAllListeners();
  }
}
