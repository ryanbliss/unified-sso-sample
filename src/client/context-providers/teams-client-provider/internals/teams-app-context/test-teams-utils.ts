import * as teamsJs from "@microsoft/teams-js";

export function getTestContext() {
    return {
        app: {
          locale: "us",
          theme: "dark",
          sessionId: "test-session-id",
          host: {
            name: "Orange" as any,
            clientType: teamsJs.HostClientType.web,
            sessionId: "test-session-id",
          },
        },
        page: {
          id: "live-share-sandbox",
          frameContext: teamsJs.FrameContexts.content,
        },
        user: {
          id: "test",
          userPrincipalName: "test@test.com",
        },
        dialogParameters: {},
      };
}