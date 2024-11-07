import { IPermissionDetails, isIPermission } from "./graph-types";

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

export type TPermissionList = IPermissionDetails[];
export function isTPermissionsList(value: any): value is TPermissionList {
  return Array.isArray(value) && value.every(isIPermission);
}
