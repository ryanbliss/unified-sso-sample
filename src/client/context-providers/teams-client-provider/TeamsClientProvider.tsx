"use client";

import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import * as teamsJs from "@microsoft/teams-js";
import { LoadErrorWrapper } from "../../components/view-wrappers";
import { Theme } from "@fluentui/react-components";
import { useTeamsAppContext } from "./internals";
import { isTeamsJsPath } from "@/client/utils/teams-js-utils";

export interface ITeamsClientContext {
  teamsContext: teamsJs.app.Context | undefined;
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

// React Context Provider
export const TeamsClientProvider: FC<{
  children: ReactNode;
  setTheme: Dispatch<SetStateAction<Theme>>;
}> = ({ children, setTheme }) => {
  const [initialized, setInitialized] = useState(false);
  const [initializeError, setError] = useState<Error | undefined>(undefined);
  const { teamsContext, error: appContextError } = useTeamsAppContext(
    initialized,
    setTheme
  );

  useEffect(() => {
    if (!initialized) {
      if (!isTeamsJsPath()) {
        setInitialized(true);
        return;
      }
      teamsJs.app
        .initialize()
        .then(() => {
          console.log("App.tsx: initializing client SDK initialized");
          teamsJs.app.notifyAppLoaded();
          teamsJs.app.notifySuccess();
          setInitialized(true);
        })
        .catch((error) => setError(error));
    }
  }, [initialized]);

  const isLoading = !initialized || !teamsContext;
  const error = initializeError || appContextError;
  const threadId = teamsContext?.chat?.id ?? teamsContext?.channel?.id;
  return (
    <TeamsClientContext.Provider
      value={{
        teamsContext,
        threadId,
      }}
    >
      <LoadErrorWrapper loading={isLoading} error={error}>
        {children}
      </LoadErrorWrapper>
    </TeamsClientContext.Provider>
  );
};
