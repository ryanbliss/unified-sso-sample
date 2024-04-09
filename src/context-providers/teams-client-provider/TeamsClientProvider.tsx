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
import { app } from "@microsoft/teams-js";
import { LoadErrorWrapper } from "../../components/view-wrappers";
import { Theme } from "@fluentui/react-components";
import { useTeamsAppContext } from "./internals";

export interface ITeamsClientContext {
  teamsContext: app.Context | undefined;
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
      app
        .initialize()
        .then(() => {
          console.log("App.tsx: initializing client SDK initialized");
          app.notifyAppLoaded();
          app.notifySuccess();
          setInitialized(true);
        })
        .catch((error) => setError(error));
    }
  }, [initialized]);

  const isLoading = !initialized || !teamsContext;
  const error = initializeError || appContextError;
  return (
    <TeamsClientContext.Provider
      value={{
        teamsContext,
      }}
    >
      <LoadErrorWrapper loading={isLoading} error={error}>
        {children}
      </LoadErrorWrapper>
    </TeamsClientContext.Provider>
  );
};
