export interface IBotInteropAuthHeader {
  headerValue: string;
}
export function isIBotInteropAuthHeader(
  value: any
): value is IBotInteropAuthHeader {
  return typeof value === "object" && typeof value.headerValue === "string";
}

export interface IBotInteropAuthCookie {
  cookieKey: string;
}

export function isIBotInteropAuthCookie(
  value: any
): value is IBotInteropAuthCookie {
  return typeof value === "object" && typeof value.cookieKey === "string";
}

export type IBotInteropEntraAuth = undefined;

export function isIBotInteropEntraAuth(
  value: any
): value is IBotInteropEntraAuth {
  return value === undefined;
}

export type TBotInteropAuthConfig =
  | IBotInteropAuthHeader
  | IBotInteropAuthCookie
  | IBotInteropEntraAuth;

export interface IAppServerConfig {
  endpoint: string;
  id: string;
  authentication?: TBotInteropAuthConfig;
}

