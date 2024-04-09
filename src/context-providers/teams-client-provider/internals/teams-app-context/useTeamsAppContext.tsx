"use client";

import {
  teamsDarkTheme,
  teamsHighContrastTheme,
  // teamsLightTheme,
  Theme,
} from "@fluentui/react-components";
import { app, HostClientType, FrameContexts } from "@microsoft/teams-js";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

const LOCAL_STORAGE_KEY = "codebox-live-user-id";

/**
 * @hidden
 * @returns app.Context | undefined and error | undefined
 */
export const useTeamsAppContext = (
  initialized: boolean,
  setTheme: Dispatch<SetStateAction<Theme>>
): {
  teamsContext: app.Context | undefined;
  error: Error | undefined;
} => {
  const [ctx, setCtx] = useState<app.Context | undefined>();
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    if (!ctx?.user?.id && initialized) {
      console.log("useTeamsContext: Attempting to get Teams context");
      app
        .getContext()
        .then((context) => {
          console.log(
            `useTeamsContext: received context: ${JSON.stringify(context)}`
          );
          switch (context.app.theme) {
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
          setCtx(context);
        })
        .catch((error) => setError(error));
    }
  }, [ctx?.user?.id, initialized, setTheme]);

  return {
    teamsContext: ctx,
    error,
  };
};
