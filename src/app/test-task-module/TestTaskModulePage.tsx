"use client";

import { LoadWrapper } from "@/components/view-wrappers";
import { Button } from "@fluentui/react-components";
import * as teamsJs from "@microsoft/teams-js";
import { useEffect, useState } from "react";

export function TestTaskModulePage() {
  const [loading] = useState(
    new URL(window.location.href).searchParams.get("close") === "true"
  );

  useEffect(() => {
    if (!loading) return;
    teamsJs.dialog.url.submit();
  }, [loading]);

  if (loading) {
    return <LoadWrapper text="Loading..." />;
  }
  return (
    <>
      <Button
        onClick={() => {
          // If in a task module, we submit the task, which will close the task module
          teamsJs.dialog.url.submit({
            // Teams AI library requires the verb be attached to the data field
            verb: "task-module",
            response: "Text",
          });
        }}
      >
        {"Finish with text"}
      </Button>
      <Button
        onClick={() => {
          // If in a task module, we submit the task, which will close the task module
          teamsJs.dialog.url.submit({
            // Teams AI library requires the verb be attached to the data field
            verb: "task-module",
            response: null,
          });
        }}
      >
        {"Finish with null"}
      </Button>
      <Button
        onClick={() => {
          // If in a task module, we submit the task, which will close the task module
          teamsJs.dialog.url.submit({
            // Teams AI library requires the verb be attached to the data field
            verb: "task-module",
            response: undefined,
          });
        }}
      >
        {"Finish with undefined"}
      </Button>
      <Button
        onClick={() => {
          teamsJs.dialog.url.submit();
        }}
      >
        {"submit()"}
      </Button>
      <Button
        onClick={() => {
          const chainUrl = new URL(`${window.location.href}?close=true`);
          teamsJs.dialog.url.submit({
            // Teams AI library requires the verb be attached to the data field
            verb: "task-module",
            response: {
              title: "Test",
              height: "medium",
              width: "medium",
              url: chainUrl.toString(),
            },
          });
        }}
      >
        {"Chain"}
      </Button>
      <Button onClick={() => {
        teamsJs.dialog.url.submit({
          // Teams AI library requires the verb be attached to the data field
          verb: "task-module",
          response: null,
        });
        teamsJs.dialog.url.submit();
      }}>
        {"null + submit()"}
      </Button>
    </>
  );
}
