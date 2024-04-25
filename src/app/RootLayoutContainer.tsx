"use client";
import { FC, useState, ReactNode } from "react";
import {
  FluentProvider,
  teamsLightTheme,
  tokens,
} from "@fluentui/react-components";
import { TeamsClientProvider } from "@/client/context-providers";

export const RootLayoutContainer: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState(teamsLightTheme);
  return (
    <FluentProvider
      theme={theme}
      style={{
        minHeight: "0px",
        position: "absolute",
        left: "0",
        right: "0",
        top: "0",
        bottom: "0",
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground3,
      }}
    >
      <TeamsClientProvider setTheme={setTheme}>
        <div
          className="App"
          style={{
            minHeight: "0px",
            position: "absolute",
            left: "0",
            right: "0",
            top: "0",
            bottom: "0",
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </TeamsClientProvider>
    </FluentProvider>
  );
};
