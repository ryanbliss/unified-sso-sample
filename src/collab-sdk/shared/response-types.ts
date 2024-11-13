
export interface IBotInteropGetValuesRequestResponseData {
  user: Record<string, any>;
  conversation: Record<string, any>;
}
export function isIBotInteropGetValuesRequestResponseData(
  value: any
): value is IBotInteropGetValuesRequestResponseData {
  return (
    typeof value === "object" &&
    typeof (value as any).user === "object" &&
    typeof (value as any).conversation === "object"
  );
}

export interface IAppRscPermission {
  permissionType: string;
  permission: string;
}
export function isIAppRscPermission(value: any): value is IAppRscPermission {
  return (
    typeof value === "object" &&
    typeof value.permissionType === "string" &&
    typeof value.permission === "string"
  );
}

export type TPermissionList = IAppRscPermission[];
export function isTPermissionsList(value: any): value is TPermissionList {
  return Array.isArray(value) && value.every(isIAppRscPermission);
}
