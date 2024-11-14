"use client";
import { FlexColumn, FlexRow } from "@/client/components/flex";
import { Button, Tab, TabList } from "@fluentui/react-components";
import { ScrollWrapper } from "@/client/components/scroll-wrapper";
import { useState } from "react";
import { DebugInfo } from "@/client/components/debug-info/DebugInfo";
import { ViewNotes } from "@/client/components/notes/ViewNotes";
import { useRouter } from "next/navigation";
import { CollabSdkTest } from "@/client/components/collab-sdk-test/CollabSdkTest";
import { useTeamsClientContext } from "@/client/context-providers";

export default function HomePageContainer() {
  const { client } = useTeamsClientContext();
  const [selectedTab, setSelectedTab] = useState(
    client?.host.page.customData ? "tab3" : "tab1"
  );
  const router = useRouter();
  return (
    <main>
      <ScrollWrapper>
        <FlexColumn
          vAlign="center"
          marginSpacer="small"
          style={{
            padding: "24px",
          }}
        >
          <FlexRow spaceBetween vAlign="center">
            <TabList
              selectedValue={selectedTab}
              onTabSelect={(ev, data) => {
                const value = data.value;
                if (typeof value !== "string") {
                  console.error(
                    `Invalid tab select data of ${JSON.stringify(data)}`
                  );
                  return;
                }
                setSelectedTab(value);
              }}
            >
              <Tab value="tab1">{"Notes"}</Tab>
              <Tab value="tab2">{"Debug"}</Tab>
              <Tab value="tab3">{"Collab SDK"}</Tab>
            </TabList>
            <Button
              onClick={() => {
                router.push("/api/auth/signout");
              }}
            >
              {"Sign out"}
            </Button>
          </FlexRow>
          {selectedTab === "tab1" && <ViewNotes />}
          {selectedTab === "tab2" && <DebugInfo />}
          {selectedTab === "tab3" && <CollabSdkTest />}
        </FlexColumn>
      </ScrollWrapper>
    </main>
  );
}
