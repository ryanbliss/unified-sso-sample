import {
  Attachment,
  CardFactory,
  TurnContext,
} from "botbuilder";
import { ApplicationTurnState, botApp } from "./bot-app";
import { decodeMSALToken } from "@/server/utils/msal-token-utils";
import { findAADUser } from "@/server/database/user";
import { getUserDetailsFromGraph } from "./graph";
import { createGraphSignInCard, createUserProfileCard } from "./cards";

/**
 * Setup some message & card handlers for commands that can be helpful for debugging
 */
export function setupBotDebugMessageHandlers() {
  // Get the activity object, which is useful for debugging
  botApp.message(
    "/activity",
    async (context: TurnContext, state: ApplicationTurnState) => {
      // Send message
      await context.sendActivity(JSON.stringify(context.activity, null, 4));
    }
  );

  // Get app user info
  botApp.message(
    "/user",
    async (context: TurnContext, state: ApplicationTurnState) => {
      if (!context.activity.from.aadObjectId) {
        await context.sendActivity(
          "This user does not have a valid aadObjectId"
        );
        return;
      }
      if (!context.activity.conversation.tenantId) {
        await context.sendActivity(
          "This conversation does not have a valid tenantId"
        );
        return;
      }
      console.log(
        "bot-app.message /user:",
        JSON.stringify(decodeMSALToken(state.temp.authTokens["graph"]), null, 2)
      );
      const user = await findAADUser(
        context.activity.from.aadObjectId!,
        context.activity.conversation.tenantId!
      );
      if (!user) {
        await context.sendActivity("No account linked to this AAD user");
        return;
      }
      // Send message
      await context.sendActivity(
        `${user.email} is logged in to app & linked to AAD user ${context.activity.from.aadObjectId}`
      );
    }
  );

  botApp.message(
    "/signout",
    async (context: TurnContext, state: ApplicationTurnState) => {
      console.log("bot-app.message /signout:", JSON.stringify(state));
      await botApp.authentication.signOutUser(context, state);

      // Echo back users request
      await context.sendActivity(`You have signed out`);
    }
  );

  // Get app user's notes
  botApp.message(
    "/login",
    async (context: TurnContext, state: ApplicationTurnState) => {
      // Handle message
      console.log(
        "app.activity .Message: start with turn state",
        JSON.stringify(state)
      );
      let card: Attachment;
      const token = state.temp.authTokens?.["graph"];
      if (token) {
        console.log("app.activity .Message: already logged in, graph start");
        const user = await getUserDetailsFromGraph(token);
        console.log("app.activity .Message: graph end");
        card = createUserProfileCard(user.displayName, user.profilePhoto);
      } else {
        console.log(
          "app.activity .Message: no token in _state, sending sign in card"
        );
        // This won't ever happen while autoSignIn is false
        card = createGraphSignInCard();
      }

      console.log("app.activity .Message: context.sendActivity with card");
      await context.sendActivity({ attachments: [card] });
      console.log("app.activity .Message: context.sendActivity sent");
    }
  );

  /**
   * Adaptive card handlers
   */
  // Handle sign in adaptive card button click
  botApp.adaptiveCards.actionExecute(
    "signin",
    async (_context: TurnContext, state: ApplicationTurnState) => {
      console.log(
        "app.adaptiveCards.actionExecute signin: start with state",
        JSON.stringify(state)
      );
      const token = state.temp.authTokens["graph"];
      if (!token) {
        console.error(
          "app.adaptiveCards.actionExecute signin: No auth token found in state. Authentication failed."
        );
        throw new Error("No auth token found in state. Authentication failed.");
      }
      console.log("app.adaptiveCards.actionExecute signin: graph start");

      const user = await getUserDetailsFromGraph(token);
      console.log("app.adaptiveCards.actionExecute signin: graph end");
      const profileCard = createUserProfileCard(
        user.displayName,
        user.profilePhoto
      );
      console.log("app.adaptiveCards.actionExecute signin: created card");

      return profileCard.content;
    }
  );

  // Handle sign out adaptive card button click
  botApp.adaptiveCards.actionExecute(
    "signout",
    async (context: TurnContext, state: ApplicationTurnState) => {
      console.log(
        "bot-app.adaptiveCards.actionExecute signout: start with state",
        JSON.stringify(state)
      );
      await botApp.authentication.signOutUser(context, state);
      console.log(
        "bot-app.adaptiveCards.actionExecute signout: success",
        JSON.stringify(state)
      );

      const initialCard = createGraphSignInCard();

      return initialCard.content;
    }
  );

  botApp.message("/collab-stage", async (context, state) => {
    const card = CardFactory.adaptiveCard({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.5",
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: `This card is for testing collab stage prior to account linking.`,
          size: "Medium",
          weight: "Bolder",
        },
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "View",
          data: {
            msteams: {
              type: "invoke",
              value: {
                type: "tab/tabInfoAction",
                tabInfo: {
                  contentUrl: `https://${process.env.BOT_DOMAIN}`,
                  websiteUrl: `https://${process.env.BOT_DOMAIN}`,
                  name: "Notes",
                  entityId: "UNIFY_NOTES",
                },
              },
            },
          },
        },
      ],
    });
    await context.sendActivity({
      attachments: [card],
    });
  });
}
