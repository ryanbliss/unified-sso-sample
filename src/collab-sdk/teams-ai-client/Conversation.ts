import * as teamsJs from "@microsoft/teams-js";
import { Application } from "./Application";
import { Bot } from "./Bot";
import { IBotInteropConfig } from "./client-bot-interop-types";
import { TeamsPagedMembersResult } from "./roster-types";

export class Conversation {
  private application: Application;
  public readonly bot: Bot;
  constructor(application: Application, botInteropConfig?: IBotInteropConfig) {
    this.application = application;
    this.bot = new Bot(application, botInteropConfig);
  }
  private get context(): teamsJs.app.Context {
    // @ts-expect-error using protected property intentionally
    return this.application.teamsJsContext;
  }
  public get id(): string | undefined {
    const knownThreadId = this.context.chat?.id ?? this.context.channel?.id;
    if (!knownThreadId) {
      const userId = this.context.user?.id;
      if (!userId) {
        return undefined;
      }
      if (!this.bot.configuration) {
        return undefined;
      }
      // TODO: replace with something better
      return `19:${userId}_${this.bot.configuration.id}@unq.gbl.spaces`;
    }
  }
  // TODO: replace return type with something more strongly typed
  public get type(): "chat" | "channel" | "meeting" | "personal" {
    if (this.context.chat?.id) {
      return "chat";
    }
    if (this.context.channel?.id) {
      return "channel";
    }
    if (this.context.meeting?.id) {
      return "meeting";
    }
    return "personal";
  }

  /**
   * Indicates whether the conversation contains more than two participants at the time the
   * activity was generated.
   */
  public isGroup(): boolean {
    throw new Error("Not implemented");
  }
  /**
   * This conversation's tenant ID
   */
  public tenantId(): boolean {
    throw new Error("Not implemented, teams-js only exposes user tenantId");
  }
  /**
   * Display friendly name
   */
  public name(): string {
    throw new Error("Not implemented");
  }
  /**
   * This account's object ID within Azure Active Directory (AAD)
   */
  public aadObjectId(): string | undefined {
    throw new Error(
      "Not implemented, teams-js only exposes local user tenantId"
    );
  }

  public getRoster(): Promise<TeamsPagedMembersResult> {
    throw new Error(
      "Not implemented, teams-js only exposes local user tenantId"
    );
  }
}
