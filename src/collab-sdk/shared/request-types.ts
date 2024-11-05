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
export interface IBotInteropSetValueRequestData<TData extends any = unknown>
  extends IBotInteropRequestData {
  type: "set-value";
  key: string;
  value: TData;
}
export function isIBotInteropSetValueRequestData(
  value: any
): value is IBotInteropSetValueRequestData {
  return (
    isIBotInteropRequestData(value) &&
    value.type === "set-value" &&
    typeof (value as any).key === "string"
  );
}
export interface IBotInteropGetValuesRequestData
  extends IBotInteropRequestData {
  type: "get-values";
}
export function isIBotInteropGetValuesRequestData(
  value: any
): value is IBotInteropGetValuesRequestData {
  return isIBotInteropRequestData(value) && value.type === "get-values";
}
