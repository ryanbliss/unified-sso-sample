import * as teamsJs from "@microsoft/teams-js";
import { Application } from "./Application";
import { IGraphMember, isIGraphMemberDetailsResponse } from "../shared";
import { AppServerNetworkClient } from "./internals/AppServerNetworkClient";
import { IGetRosterOptions } from "./Conversation-types";

export class Team {
  private application: Application;
  private _networkClient: AppServerNetworkClient;
  constructor(application: Application, networkClient: AppServerNetworkClient) {
    this.application = application;
    this._networkClient = networkClient;
  }
  private get context(): teamsJs.app.Context {
    // @ts-expect-error using protected property intentionally
    return this.application.teamsJsContext;
  }
  public get id(): string {
    if (!this.context.team?.internalId) {
      throw new Error(
        "team.id not found, which is an unexpected error. Only construct Team if teamsJs app.Context.team.id is defined."
      );
    }
    return this.context.team.internalId;
  }

  public get displayName(): string | undefined {
    if (!this.context.team) {
      throw new Error(
        "team is undefined, which is an unexpected error. Only construct Team if teamsJs app.Context.team is defined."
      );
    }
    return this.context.team.displayName;
  }

  public get type(): teamsJs.TeamType | undefined {
    if (!this.context.team) {
      throw new Error(
        "team is undefined, which is an unexpected error. Only construct Team if teamsJs app.Context.team is defined."
      );
    }
    return this.context.team.type;
  }

  public get groupId(): string | undefined {
    if (!this.context.team) {
      throw new Error(
        "team is undefined, which is an unexpected error. Only construct Team if teamsJs app.Context.team is defined."
      );
    }
    return this.context.team.groupId;
  }

  public get isArchived(): boolean {
    if (!this.context.team) {
      throw new Error(
        "team is undefined, which is an unexpected error. Only construct Team if teamsJs app.Context.team is defined."
      );
    }
    return this.context.team.isArchived ?? false;
  }

  public get userRole(): teamsJs.UserTeamRole | undefined {
    if (!this.context.team) {
      throw new Error(
        "team is undefined, which is an unexpected error. Only construct Team if teamsJs app.Context.team is defined."
      );
    }
    return this.context.team.userRole;
  }

  /**
   *
   * @param options Optional. Request {@link IGetRosterOptions} options.
   * @param options.requestType Optional. See {@link IGetRosterOptions.requestType} for more details.
   * @returns roster of the team
   */
  public async getRoster(options?: IGetRosterOptions): Promise<IGraphMember[]> {
    let requestType: "server" | "client" | undefined = options?.requestType;

    if (requestType === "server" && !this._networkClient.configuration) {
      throw new Error(
        "Conversation.getRoster: `Application.serverConfiguration` is not set. Set `Application.serverConfiguration` before calling this method. For more information about how to use this API, visit https://aka.ms/TODOPLACEHOLDER"
      );
    } else if (
      requestType === "client" &&
      !this.application.authentication.entra.isInitialized
    ) {
      throw new Error(
        "Conversation.getRoster: `Application.authentication.entra` has not been initialized. Await `Application.authentication.entra.initialize()` before calling this method. For more information about how to use this API, visit https://aka.ms/TODOPLACEHOLDER"
      );
    } else if (!this._networkClient.configuration && !requestType) {
      if (!this.application.authentication.entra.isInitialized) {
        throw new Error(
          "Conversation.getRoster: `Application.serverConfiguration` is not set, nor has `Application.authentication.entra` been initialized. For more information about how to use this API, visit https://aka.ms/TODOPLACEHOLDER"
        );
      }
      requestType = "client";
    } else if (!requestType) {
      requestType = "server";
    }

    // Request via server
    if (requestType === "server") {
      const requestData = {
        type: "get-graph-roster",
        subtype: "team",
      };

      const response = await this._networkClient.request<any>(
        this._networkClient.configuration!.endpoint,
        requestData
      );
      if (!isIGraphMemberDetailsResponse(response)) {
        throw new Error(
          `Conversation.getRoster: Unexpected response from get-paged-roster request, ${response}`
        );
      }
      return response.value;
    }

    // Request via client
    const response = await this.application.graph
      .api(`/teams/${this.id}/members`)
      .get();
    if (!isIGraphMemberDetailsResponse(response)) {
      throw new Error(
        `Conversation.getRoster: Unexpected response from get-paged-roster request, ${response}`
      );
    }
    return response.value;
  }
}
