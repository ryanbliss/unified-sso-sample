export interface IPermission {
  permissionType: string;
  permission: string;
}
export function isIPermission(value: any): value is IPermission {
  return (
    typeof value === "object" &&
    typeof value.permissionType === "string" &&
    typeof value.permission === "string"
  );
}
export interface IPermissionDetails extends IPermission {
  id: string;
  clientAppId: string;
  resourceAppId: string;
  clientId: string;
}
export function isIPermissionDetails(value: any): value is IPermissionDetails {
  return (
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.clientAppId === "string" &&
    typeof value.resourceAppId === "string" &&
    typeof value.clientId === "string" &&
    isIPermission(value)
  );
}
export interface IPermissionDetailsResponse {
  "@odata.context": string;
  value: IPermissionDetails[];
}
export function isIPermissionDetailsResponse(
  value: any
): value is IPermissionDetailsResponse {
  return (
    typeof value === "object" &&
    typeof value["@odata.context"] === "string" &&
    Array.isArray(value.value) &&
    value.value.every(isIPermissionDetails)
  );
}

export interface IGraphMember {
  "@odata.type": string;
  id: string;
  roles: string[];
  displayName: string;
  userId: string;
  email: string;
}
export function isIGraphMember(value: any): value is IGraphMember {
  return (
    typeof value === "object" &&
    typeof value["@odata.type"] === "string" &&
    typeof value.id === "string" &&
    Array.isArray(value.roles) &&
    typeof value.displayName === "string" &&
    typeof value.userId === "string" &&
    typeof value.email === "string"
  );
}

export interface IGraphMemberDetailsResponse {
  "@odata.context": string;
  "@odata.count": number;
  value: IGraphMember[];
}
export function isIGraphMemberDetailsResponse(
  value: any
): value is IGraphMemberDetailsResponse {
  return (
    typeof value === "object" &&
    typeof value["@odata.context"] === "string" &&
    Array.isArray(value.value) &&
    value.value.every(isIGraphMember)
  );
}
