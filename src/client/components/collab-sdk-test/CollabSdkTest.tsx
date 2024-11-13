import { Title3 } from "@fluentui/react-components";
import { FC } from "react";
import { FlexColumn } from "../flex";
import { BotActionExample } from "./internal/BotActionExample";
import { BotUserStorageExample } from "./internal/BotUserStorageExample";
import { BotConversationStorageExample } from "./internal/BotConversationStorageExample";
import { BotGetRosterExample } from "./internal/BotGetRosterExample";
import { GraphGetInstalledRscPermissionsExample } from "./internal/GraphInstalledRscPermissionsExample";
import { GraphGetMembersExample } from "./internal/GraphGetMembersExample";
import { GraphGetMemberExample } from "./internal/GraphGetMemberExample";

export const CollabSdkTest: FC = () => {
  return (
    <>
      <FlexColumn marginSpacer="medium">
        <Title3>{"Collab SDK"}</Title3>
        <BotActionExample />
        <BotUserStorageExample />
        <BotConversationStorageExample />
        <BotGetRosterExample />
        <GraphGetMembersExample />
        <GraphGetMemberExample />
        <GraphGetInstalledRscPermissionsExample />
      </FlexColumn>
    </>
  );
};
