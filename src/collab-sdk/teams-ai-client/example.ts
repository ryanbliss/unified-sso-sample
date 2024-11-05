import { ApplicationBuilder } from "./ApplicationBuilder";

export async function initializeTeams() {
  const applicationBuilder = new ApplicationBuilder();
  applicationBuilder.withBot({
    endpoint: "https://example.com/bot/messaging",
    id: "example-app-id",
    authentication: {
      cookieKey: "Authorization",
    },
  });
  const teamsApp = await applicationBuilder.build();

  const roster = await teamsApp.conversation.getRoster();
  // Unified "conversation" object for all scope types
  console.log(
    "Roster:",
    roster,
    "...for conv type:",
    teamsApp.conversation.type
  );
  // Trigger an action, which server could use to send a message to the chat/channel, kick off a task, return data to the client, etc.
  const response = await teamsApp.conversation.bot.triggerAction(
    "some-action",
    {
      foo: "bar",
    }
  );
  console.log("response", response);

  // Set a value that the server can use to remember client state
  await teamsApp.conversation.bot.storage.set("some-key", {
    route: window.location.pathname,
  });

  // Get a value from the server
  const currentConversationState = teamsApp.conversation.bot.storage.get("conv-state");

  // Could listen for changes to values as well (not yet implemented)
//   teamsApp.conversation.bot.on("change", (key, value) => {
//     console.log("Value changed:", key, value);
//   });
}
