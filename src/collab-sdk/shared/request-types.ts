export interface IBotInteropRequestData {
  type: string;
  threadId: string;
}
export function isIBotInteropRequestData(
  value: any
): value is IBotInteropRequestData {
  return (
    typeof value === "object" &&
    typeof value.type === "string" &&
    typeof value.threadId === "string"
  );
}

export interface IBotInteropActionData<TData> {
  type: string;
  customData: TData;
}
export interface IBotInteropActionRequestData<TData extends any = unknown>
  extends IBotInteropRequestData {
  type: "action";
  action: IBotInteropActionData<TData>;
}
export function isIBotInteropActionRequestData(
  value: any
): value is IBotInteropActionRequestData {
  return (
    isIBotInteropRequestData(value) &&
    value.type === "action" &&
    typeof (value as any).action === "object"
  );
}
export type TBotStorageScopeType = "conversation" | "user";

export interface IBotInteropSetValueRequestData<TData extends any = unknown>
  extends IBotInteropRequestData {
  type: "set-value";
  scope: TBotStorageScopeType;
  key: string;
  value: TData;
}
export function isIBotInteropSetValueRequestData(
  value: any
): value is IBotInteropSetValueRequestData {
  return (
    isIBotInteropRequestData(value) &&
    value.type === "set-value" &&
    typeof (value as any).scope === "string" &&
    typeof (value as any).key === "string"
  );
}
export interface IBotInteropGetValuesRequestData
  extends IBotInteropRequestData {
  type: "get-values";
}
export function isIBotInteropGetRosterRequestData(
  value: any
): value is IBotInteropGetRosterRequestData {
  return isIBotInteropRequestData(value) && value.type === "get-paged-roster";
}
export interface IBotInteropGetRosterRequestData extends IBotInteropRequestData {
  type: "get-paged-roster";
  continuationToken?: string;
}
export function isIBotInteropGetValuesRequestData(
  value: any
): value is IBotInteropGetValuesRequestData {
  return isIBotInteropRequestData(value) && value.type === "get-values";
}

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
