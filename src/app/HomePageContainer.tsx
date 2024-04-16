"use client";
import { FlexColumn, FlexRow } from "@/components/flex";
import { Button, Tab, TabList } from "@fluentui/react-components";
import { ScrollWrapper } from "@/components/scroll-wrapper";
import { useState } from "react";
import { DebugInfo } from "@/components/debug-info/DebugInfo";
import { ViewNotes } from "@/components/notes/ViewNotes";
import { useRouter } from "next/navigation";

export default function HomePageContainer() {
  const [selectedTab, setSelectedTab] = useState("tab1");
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
          <FlexRow spaceBetween>
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
        </FlexColumn>
      </ScrollWrapper>
    </main>
  );
}
