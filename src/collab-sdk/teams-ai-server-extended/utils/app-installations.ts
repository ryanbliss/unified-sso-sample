import {
  IAppInstallation,
  IAppInstallationResponse,
  isIPermissionDetailsResponse,
  ITeamsAppDefinition,
  TConversationType,
  TPermissionList,
} from "@/collab-sdk/shared";

export async function getRscPermissions(
  token: string,
  conversationType: TConversationType,
  conversationId: string,
  appId: string
): Promise<TPermissionList> {
  const endpoint =
    conversationType === "chat"
      ? `https://graph.microsoft.com/beta/chats/${conversationId}/permissionGrants`
      : `https://graph.microsoft.com/beta/teams/${conversationId}/permissionGrants`;
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
  if (!isIPermissionDetailsResponse(json)) {
    throw new Error("Invalid response from Graph API");
  }
  const conversationPermissions: TPermissionList = json.value
    .filter((permission) => permission.clientAppId === appId)
    .map((permission) => ({
      permissionType: permission.permissionType,
      permission: permission.permission,
    }));
  return conversationPermissions;
}

export async function getTeamsAppInstallation(
  token: string,
  conversationType: TConversationType,
  id: string,
  appId: string
): Promise<IAppInstallation> {
  let endpoint: string;
  if (conversationType === "chat") {
    endpoint = `https://graph.microsoft.com/v1.0/chats/${id}/installedApps?$expand=teamsAppDefinition`;
  } else if (conversationType === "channel") {
    endpoint = `https://graph.microsoft.com/v1.0/teams/${id}/installedApps?$expand=teamsAppDefinition`;
  } else if (conversationType === "personal") {
    endpoint = `https://graph.microsoft.com/v1.0/users/${id}/teamwork/installedApps?$expand=teamsAppDefinition`;
  } else {
    throw new Error(`Invalid conversation type: ${conversationType}`);
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
  if (!IAppInstallationResponse(json)) {
    throw new Error("Invalid response from Graph API");
  }
  const appInstallation = json.value.find(
    (app) => app.teamsAppDefinition.azureADAppId === appId
  );
  if (!appInstallation) {
    throw new Error("App not installed in conversation");
  }
  return appInstallation;
}
