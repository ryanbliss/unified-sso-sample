import { Title3 } from "@fluentui/react-components";
import { FC } from "react";
import { FlexColumn } from "../flex";
import { BotActionExample } from "./internal/BotActionExample";
import { BotUserStorageExample } from "./internal/BotUserStorageExample";
import { BotConversationStorageExample } from "./internal/BotConversationStorageExample";

export const CollabSdkTest: FC = () => {
  return (
    <>
      <FlexColumn marginSpacer="medium">
        <Title3>{"Collab SDK"}</Title3>
        <BotActionExample />
        <BotUserStorageExample />
        <BotConversationStorageExample />
      </FlexColumn>
    </>
  );
};
