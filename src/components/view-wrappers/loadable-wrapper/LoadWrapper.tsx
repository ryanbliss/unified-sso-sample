"use client"

import { FlexColumn } from "@/components/flex";
import { Spinner, Text } from "@fluentui/react-components";
import { FC, PropsWithChildren } from "react";

export const LoadWrapper: FC<
  PropsWithChildren & {
    text: string;
  }
> = ({ children, text }) => {
  return (
    <FlexColumn
      expand="fill"
      vAlign="center"
      hAlign="center"
      marginSpacer="small"
    >
      <Spinner />
      <Text>{text}</Text>
      {children}
    </FlexColumn>
  );
};
