"use client";

import { Button } from "@fluentui/react-components";
import * as teamsJs from "@microsoft/teams-js";

export function TestTaskModulePage() {
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
      <Button onClick={() => {
        teamsJs.dialog.url.submit();
      }}>
        {"teamsJs.dialog.url.submit()"}
      </Button>
    </>
  );
}
