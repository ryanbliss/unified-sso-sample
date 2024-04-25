export enum PubSubEventTypes {
  NOTE_CHANGE = "NOTE_CHANGE",
  DELETE_NOTE = "DELETE_NOTE",
  UPDATE_USER_CLIENT_STATE = "UPDATE_USER_CLIENT_STATE",
  OTHER = "OTHER",
}

export interface PubSubEvent<TData = any> {
  type: PubSubEventTypes;
  data: TData;
}

function _isPubSubEvent<TData = any>(
  value: any
): value is PubSubEvent<TData> {
  const types = Object.values(PubSubEventTypes);
  return (
    !!value &&
    typeof value === "object" &&
    typeof value.type === "string" &&
    types.includes(value.type)
  );
}

export function isPubSubEvent<TData = any>(
  value: any,
  dataValidator: (data: any) => data is TData
): value is PubSubEvent<TData> {
  return _isPubSubEvent(value) && dataValidator(value.data);
}
