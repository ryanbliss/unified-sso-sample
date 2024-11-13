import { IGraphMemberDetailsResponse, isIGraphMemberDetailsResponse } from "@/collab-sdk/shared";

export async function getGraphRoster(
    token: string,
    rosterType: string,
    conversationId: string,
    teamId?: string
  ): Promise<IGraphMemberDetailsResponse> {
    let endpoint: string;
    if (rosterType === "chat") {
      endpoint = `https://graph.microsoft.com/v1.0/chats/${conversationId}/members`;
    } else if (rosterType === "channel") {
      if (!teamId) {
        throw new Error("`teamId` is required to get channel roster");
      }
      endpoint = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${conversationId}/members`;
    } else if (rosterType === "team") {
      if (!teamId) {
        throw new Error("`teamId` is required to get team roster");
      }
      endpoint = `https://graph.microsoft.com/v1.0/teams/${teamId}/members`;
    } else {
      throw new Error(
        `Invalid request subtype of ${rosterType} for 'getRoster'. Valid subtypes include 'chat', 'channel', or 'team'.`
      );
    }
    const graphRequestParams = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "bearer " + token,
      },
    };

    const response = await fetch(endpoint, graphRequestParams);
    const json = await response.json();
    if (!response.ok) {
      throw new Error(
        json.error?.message || `HTTP error! status: ${response.status}`
      );
    }
    if (!isIGraphMemberDetailsResponse(json)) {
      throw new Error("Invalid response from Graph API");
    }
    return json;
  }