import {
  isIPermissionDetailsResponse,
  TConversationType,
  TPermissionList,
} from "@/collab-sdk/shared";

export async function getRscPermissions(
  token: string,
  conversationType: TConversationType,
  conversationId: string,
  appId: string,
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
