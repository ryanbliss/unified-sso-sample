import * as teamsJs from "@microsoft/teams-js";

export const isSdkError = (value: any): value is teamsJs.SdkError => {
  return typeof value?.errorCode === "number" && value.errorCode in teamsJs.ErrorCode;
};

export function isTeamsJsPath(): boolean {
  const url = new URL(window.location.href);
  return !["/legal"].includes(url.pathname);
}
