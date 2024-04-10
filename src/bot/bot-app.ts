// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
  ActivityTypes,
  ConfigurationServiceClientCredentialFactory,
  MemoryStorage,
  TurnContext,
  Attachment,
} from "botbuilder";

import {
  ApplicationBuilder,
  TurnState,
  TeamsAdapter,
  AuthError,
} from "@microsoft/teams-ai";
import { createUserProfileCard, createSignInCard } from "./cards";
import { getUserDetailsFromGraph } from "./graph";

interface ConversationState {
  count: number;
}
type ApplicationTurnState = TurnState<ConversationState>;
const USE_CARD_AUTH = process.env.AUTH_TYPE === "card";

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
export const botAdapter = new TeamsAdapter(
  {},
  new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.BOT_ID,
    MicrosoftAppPassword: process.env.BOT_PASSWORD,
    MicrosoftAppType: "MultiTenant",
  })
);

// Catch-all for errors.
const onTurnErrorHandler = async (context: any, error: any) => {
  // This check writes out errors to console log .vs. app insights.
  // NOTE: In production environment, you should consider logging this to Azure
  //       application insights.
  console.error(`\n [onTurnError] unhandled error: ${error.toString()}`);

  // Send a trace activity, which will be displayed in Bot Framework Emulator
  await context.sendTraceActivity(
    "OnTurnError Trace",
    `${error.toString()}`,
    "https://www.botframework.com/schemas/error",
    "TurnError"
  );

  // Send a message to the user
  await context.sendActivity("The bot encountered an error or bug.");
  await context.sendActivity(
    "To continue to run this bot, please fix the bot source code."
  );
};

// Set the onTurnError for the singleton CloudAdapter.
botAdapter.onTurnError = onTurnErrorHandler;

// Define storage and application
const storage = new MemoryStorage();
export const botApp = new ApplicationBuilder<ApplicationTurnState>()
  .withStorage(storage)
  .withAuthentication(botAdapter, {
    autoSignIn: (context: TurnContext) => {
      // Disable auto sign in for message activities
      if (USE_CARD_AUTH && context.activity.type == ActivityTypes.Message) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    },
    settings: USE_CARD_AUTH
      ? {
          graph: {
            connectionName: process.env.OAUTH_CONNECTION_NAME ?? "",
            title: "Sign in",
            text: "Please sign in to use the bot.",
            endOnInvalidMessage: true,
            tokenExchangeUri: process.env.TOKEN_EXCHANGE_URI ?? "", // this is required for SSO
            enableSso: true,
          },
        }
      : {
          graph: {
            scopes: ["User.Read"],
            msalConfig: {
              auth: {
                clientId: process.env.BOT_ID!,
                clientSecret: process.env.BOT_PASSWORD!,
                authority: `${process.env.AAD_APP_OAUTH_AUTHORITY_HOST}/${process.env.AAD_APP_TENANT_ID}`,
              },
            },
            signInLink: `https://${process.env.BOT_DOMAIN}/auth/start`,
            endOnInvalidMessage: true,
          },
        },
  })
  .build();

// Listen for user to say '/reset' and then delete conversation state
botApp.message(
  "/reset",
  async (context: TurnContext, state: ApplicationTurnState) => {
    state.deleteConversationState();
    await context.sendActivity(
      `Ok I've deleted the current conversation state.`
    );
  }
);

botApp.message(
  "/signout",
  async (context: TurnContext, state: ApplicationTurnState) => {
    await botApp.authentication.signOutUser(context, state);

    // Echo back users request
    await context.sendActivity(`You have signed out`);
  }
);

botApp.message(
  "/activity",
  async (context: TurnContext, state: ApplicationTurnState) => {
    await context.sendActivity(JSON.stringify(context.activity));
  }
);

// Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
botApp.activity(
  ActivityTypes.Message,
  async (context: TurnContext, _state: ApplicationTurnState) => {
    if (USE_CARD_AUTH) {
      console.log("app.activity .Message: start");
      let card: Attachment;
      const token = _state.temp.authTokens?.["graph"];
      if (token) {
        console.log("app.activity .Message: already logged in, graph start");
        const user = await getUserDetailsFromGraph(token);
        console.log("app.activity .Message: graph end");
        card = createUserProfileCard(user.displayName, user.profilePhoto);
      } else {
        console.log(
          "app.activity .Message: no token in _state, sending sign in card"
        );
        card = createSignInCard();
      }

      console.log("app.activity .Message: context.sendActivity with card");
      await context.sendActivity({ attachments: [card] });
      console.log("app.activity .Message: context.sendActivity sent");
    } else {
      console.log("sending message activity");
      await context.sendActivity("hello world");
    }
  }
);

// Handle sign in adaptive card button click
botApp.adaptiveCards.actionExecute(
  "signin",
  async (_context: TurnContext, state: ApplicationTurnState) => {
    console.log("app.adaptiveCards.actionExecute signin: start");
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
    console.log("app.adaptiveCards.actionExecute signout: start");
    await botApp.authentication.signOutUser(context, state);
    console.log("app.adaptiveCards.actionExecute signout: success");

    const initialCard = createSignInCard();

    return initialCard.content;
  }
);

// Auth handlers

if (!USE_CARD_AUTH) {
  botApp.authentication
    .get("graph")
    .onUserSignInSuccess(
      async (context: TurnContext, state: ApplicationTurnState) => {
        // Successfully logged in
        await context.sendActivity("Successfully logged in");
        await context.sendActivity(
          `Token string length: ${state.temp.authTokens["graph"]!.length}`
        );
        await context.sendActivity(
          `This is what you said before the AuthFlow started: ${context.activity.text}`
        );
      }
    );

  botApp.authentication
    .get("graph")
    .onUserSignInFailure(
      async (
        context: TurnContext,
        _state: ApplicationTurnState,
        error: AuthError
      ) => {
        // Failed to login
        await context.sendActivity("Failed to login");
        await context.sendActivity(`Error message: ${error.message}`);
      }
    );
}

// export function sendMessage();