import { SdkError, ErrorCode } from "@microsoft/teams-js";

export const isSdkError = (value: any): value is SdkError => {
  return typeof value?.errorCode === "number" && value.errorCode in ErrorCode;
};

export function isTeamsJsPath(): boolean {
  const url = new URL(window.location.href);
  return ["/", "/auth/teams", "/connections", "/test-task-module"].includes(
    url.pathname
  );
}
