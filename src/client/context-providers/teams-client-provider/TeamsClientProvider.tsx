"use client";

import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { LoadErrorWrapper } from "../../components/view-wrappers";
import {
  teamsDarkTheme,
  teamsHighContrastTheme,
  Theme,
} from "@fluentui/react-components";
import { isTeamsJsPath } from "@/client/utils/teams-js-utils";
import { Application, ApplicationBuilder } from "@/collab-sdk/teams-ai-client";
import { getTestContext } from "./internals/teams-app-context/test-teams-utils";

export interface ITeamsClientContext {
  client: Application | undefined;
  threadId: string | undefined;
}

// Teams Context
export const TeamsClientContext = createContext<ITeamsClientContext>(
  {} as ITeamsClientContext
);

// React useContext
export const useTeamsClientContext = (): ITeamsClientContext => {
  const context = useContext(TeamsClientContext);
  return context;
};

const applicationBuilder = new ApplicationBuilder()
  .withServer({
    endpoint: "https://unified-sso-sample.vercel.app/api/messages",
    id: "82ba2551-3f4a-4bd0-83d4-9dd9b1900202",
  })
  .withEntraAuthentication({
    auth: {
      clientId: "82ba2551-3f4a-4bd0-83d4-9dd9b1900202",
      authority: "https://login.microsoftonline.com/common",
    },
    scopes: [
      "https://graph.microsoft.com/profile",
      "https://graph.microsoft.com/openid",
      // "https://graph.microsoft.com/ChatMember.Read.Chat",
    ],
  });

// React Context Provider
export const TeamsClientProvider: FC<{
  children: ReactNode;
  setTheme: Dispatch<SetStateAction<Theme>>;
}> = ({ children, setTheme }) => {
  const [initializeError, setError] = useState<Error | undefined>(undefined);
  const [client, setClient] = useState<Application | undefined>();

  const startedRef = useRef(false);

  const applyTheme = useCallback(
    (theme: string) => {
      switch (theme) {
        case "default": {
          // starts in light theme
          // setTheme(teamsLightTheme);
          break;
        }
        case "dark": {
          // App starts in dark theme
          setTheme(teamsDarkTheme);
          break;
        }
        case "contrast": {
          setTheme(teamsHighContrastTheme);
          break;
        }
      }
    },
    [setTheme]
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const maybeTestContext = isTeamsJsPath() ? undefined : getTestContext();

    applicationBuilder
      .withTestContext(maybeTestContext)
      .build()
      .then((app) => {
        startTransition(() => {
          setClient(app);
          applyTheme(app.host.theme);
        });
        app.host.notifyAppLoaded();
        app.host.notifySuccess();
      })
      .catch((error) => setError(error));
  }, [applyTheme]);

  // Listen for theme changes
  useEffect(() => {
    client?.host.on("themeChanged", applyTheme);
    return () => {
      client?.host.off("themeChanged", applyTheme);
    };
  }, [client, applyTheme]);

  const isLoading = !client;
  const error = initializeError;
  const threadId = client?.conversation.id;
  return (
    <TeamsClientContext.Provider
      value={{
        client,
        threadId,
      }}
    >
      <LoadErrorWrapper loading={isLoading} error={error}>
        {children}
      </LoadErrorWrapper>
    </TeamsClientContext.Provider>
  );
};
