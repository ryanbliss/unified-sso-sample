import {
  IGraphMember,
  IGraphMemberDetailsResponse,
  isIGraphMemberDetailsResponse,
} from "@/collab-sdk/shared";

export async function getGraphMembers(
  token: string,
  conversationType: string,
  conversationId: string,
  teamId?: string,
  filter?: string
): Promise<IGraphMemberDetailsResponse> {
  let endpoint: string;
  if (conversationType === "chat") {
    endpoint = `https://graph.microsoft.com/v1.0/chats/${conversationId}/members`;
  } else if (conversationType === "channel") {
    if (!teamId) {
      throw new Error("`teamId` is required to get channel roster");
    }
    endpoint = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${conversationId}/members`;
  } else if (conversationType === "team") {
    if (!teamId) {
      throw new Error("`teamId` is required to get team roster");
    }
    endpoint = `https://graph.microsoft.com/v1.0/teams/${teamId}/members`;
  } else {
    throw new Error(
      `Invalid request subtype of ${conversationType} for 'getRoster'. Valid subtypes include 'chat', 'channel', or 'team'.`
    );
  }
  if (filter) {
    endpoint += `?$filter=${filter}`;
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

export async function getGraphMember(
  token: string,
  conversationType: string,
  conversationId: string,
  userAadObjectId: string,
  teamId?: string
): Promise<IGraphMember | null> {
  const filter = `(microsoft.graph.aadUserConversationMember/userId eq '${userAadObjectId}')`;
  const response = await getGraphMembers(
    token,
    conversationType,
    conversationId,
    teamId,
    filter
  );
  if (response["@odata.count"] === 0) {
    return null;
  }
  if (response["@odata.count"] > 1) {
    throw new Error(
      "Unexpected Error: more than one member found for the given aadObjectId"
    );
  }
  return response.value[0];
}
