export type TConversationType = "chat" | "channel" | "personal";

export interface IBotInteropRequestData {
  type: string;
  subtype?: string | undefined;
  threadId: string;
  threadType: TConversationType;
  teamId: string | undefined;
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

export type TBotInteropRequestBase = Omit<
  IBotInteropRequestData,
  "threadId" | "threadType" | "teamId"
>;

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
export interface IBotInteropGetRosterRequestData
  extends IBotInteropRequestData {
  type: "get-paged-roster";
  continuationToken?: string;
}
export function isIBotInteropGetValuesRequestData(
  value: any
): value is IBotInteropGetValuesRequestData {
  return isIBotInteropRequestData(value) && value.type === "get-values";
}

export interface IBotInteropGetInstalledRscPermissionsData
  extends IBotInteropRequestData {
  type: "get-rsc-permissions";
}
export function isIBotInteropGetInstalledRscPermissionsData(
  value: any
): value is IBotInteropGetValuesRequestData {
  return (
    isIBotInteropRequestData(value) && value.type === "get-rsc-permissions"
  );
}

export interface IGetGraphMembersData extends IBotInteropRequestData {
  type: "get-graph-members";
  subtype: "chat" | "channel" | "team";
}
export function isIGetGraphMembersData(
  value: any
): value is IGetGraphMembersData {
  return (
    typeof value?.subtype === "string" &&
    isIBotInteropRequestData(value) &&
    value.type === "get-graph-members"
  );
}

export interface IGetGraphMemberData extends IBotInteropRequestData {
  type: "get-graph-member";
  subtype: "chat" | "channel" | "team";
  userAadObjectId: string;
}
export function isIGetGraphMemberData(
  value: any
): value is IGetGraphMemberData {
  return (
    typeof value?.subtype === "string" &&
    typeof value?.userAadObjectId === "string" &&
    isIBotInteropRequestData(value) &&
    value.type === "get-graph-member"
  );
}
