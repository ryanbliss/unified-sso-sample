"use client";

import { FlexColumn } from "@/components/flex";
import { ScrollWrapper } from "@/components/scroll-wrapper";
import { useTeamsClientContext } from "@/context-providers";
import { Title1 } from "@fluentui/react-components";
import { FrameContexts } from "@microsoft/teams-js";
import { FC, ReactNode } from "react";

interface ITitledPageWrapper {
  title: string;
  children?: ReactNode;
}
export const TitledPageWrapper: FC<ITitledPageWrapper> = ({
  title,
  children,
}) => {
  const { teamsContext } = useTeamsClientContext();
  const isSidePanel =
    teamsContext?.page.frameContext === FrameContexts.sidePanel;
  return (
    <FlexColumn expand="fill" style={{ maxHeight: "100vh" }}>
      <ScrollWrapper>
        <FlexColumn
          marginSpacer="medium"
          style={{
            paddingLeft: isSidePanel ? "0px" : "124px",
            paddingRight: isSidePanel ? "0px" : "124px",
            paddingTop: isSidePanel ? "0px" : "60px",
            paddingBottom: isSidePanel ? "0px" : "16px",
            height: "100%",
          }}
        >
          {!isSidePanel && <Title1>{title}</Title1>}
          {children}
        </FlexColumn>
      </ScrollWrapper>
    </FlexColumn>
  );
};
