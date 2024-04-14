// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
  ConfigurationServiceClientCredentialFactory,
  TurnContext,
  Attachment,
  Activity,
} from "botbuilder";
import * as path from "path";
import {
  ApplicationBuilder,
  TurnState,
  TeamsAdapter,
  AuthError,
  OpenAIModel,
  PromptManager,
  ActionPlanner,
  Memory,
} from "@microsoft/teams-ai";
import {
  createUserProfileCard,
  createSignInCard,
  notesCard,
  noteCard,
} from "./cards";
import { getUserDetailsFromGraph } from "./graph";
import {
  findReference,
  upsertReference,
} from "@/database/conversation-references";
import { MongoDBStorage } from "./MongoDBStorage";
import { findAADUser } from "@/database/user";
import { decodeMSALToken } from "@/utils/msal-token-utils";
import { getAppAuthToken } from "./bot-auth-utils";
import "./fs-utils";

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

botAdapter.use(async (context, next) => {
  console.log("botAdapter adding generic conversation reference");
  if (context.activity.from.aadObjectId) {
    // Store conversation reference
    addConversationReference(context.activity).catch((err) =>
      console.error(err)
    );
  }

  await next();
});

// Catch-all for errors.
const onTurnErrorHandler = async (context: TurnContext, error: any) => {
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

// Create AI components
const model = new OpenAIModel({
  // OpenAI Support
  apiKey: process.env.OPENAI_KEY!,
  defaultModel: "gpt-3.5-turbo",

  // Request logging
  logRequests: true,
});

const prompts = new PromptManager({
  promptsFolder: path.join(process.cwd(), "./src/bot/prompts"),
});

const planner = new ActionPlanner({
  model,
  prompts,
  defaultPrompt: "sequence",
});

// Define storage and application
const storage = new MongoDBStorage();
export const botApp = new ApplicationBuilder<ApplicationTurnState>()
  .withStorage(storage)
  .withAIOptions({
    planner,
  })
  .withAuthentication(botAdapter, {
    autoSignIn: (context: TurnContext) => {
      // Disable auto sign in for message activities
      // if (USE_CARD_AUTH && context.activity.type == ActivityTypes.Message) {
      //   return Promise.resolve(false);
      // }
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
    console.log("bot-app.message /signout:", JSON.stringify(state));
    await botApp.authentication.signOutUser(context, state);

    // Echo back users request
    await context.sendActivity(`You have signed out`);
  }
);

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
      await context.sendActivity("This user does not have a valid aadObjectId");
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

// Get app user's notes
botApp.message(
  "/login",
  async (context: TurnContext, state: ApplicationTurnState) => {
    // Handle message
    if (USE_CARD_AUTH) {
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

// AI handlers

// Define a prompt function for getting the current status of the lights
planner.prompts.addFunction(
  "getNotes",
  async (context: TurnContext, memory: Memory) => {
    let userAppToken: string;
    try {
      userAppToken = await getAppAuthToken(context);
    } catch (err) {
      // TODO: init app linking flow if not already linked
      console.error(`bot-app.ai.GetNotes: error ${err}`);
      return "You are not authenticated, please sign in to continue";
    }
    try {
      // Get user notes
      const response = await fetch(
        new URL(`https://${process.env.BOT_DOMAIN}/api/notes/list/my`),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: userAppToken,
          },
        }
      );
      const body = await response.json();
      if (response.status !== 200) {
        throw new Error(body.error);
      }
      return `${body.notes.map(
        (note: any) =>
          `NOTE:\n  Note text: ${note.text}\n  Created at: ${note.createdAt}\n  Edited at: ${note.editedAt}\n`
      )}`;
    } catch (err) {
      console.error(`bot-app.message /notes: error ${err}`);
      return "Error getting notes";
    }
  }
);

// Get app user's notes
botApp.ai.action(
  "GetNotes",
  async (
    context: TurnContext,
    state: ApplicationTurnState,
    paramaters: undefined
  ) => {
    console.log("ot-app.ai.GetNotes: action start");
    let userAppToken: string;
    try {
      userAppToken = await getAppAuthToken(context);
    } catch (err) {
      // TODO: init app linking flow if not already linked
      console.error(`bot-app.ai.GetNotes: error ${err}`);
      return "You are not authenticated, please sign in to continue";
    }
    try {
      // Get user notes
      const response = await fetch(
        new URL(`https://${process.env.BOT_DOMAIN}/api/notes/list/my`),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: userAppToken,
          },
        }
      );
      const body = await response.json();
      if (response.status !== 200) {
        throw new Error(body.error);
      }
      await context.sendActivity({
        attachments: [notesCard(body.notes)],
      });
    } catch (err) {
      console.error(`bot-app.message /notes: error ${err}`);
      return "Error getting notes";
    }

    return "I've retrieved your notes for you. What else can I help you wiht?";
  }
);

// Create a new note
botApp.ai.action(
  "CreateNote",
  async (
    context: TurnContext,
    state: ApplicationTurnState,
    paramaters: {
      text: string;
    }
  ) => {
    console.log("ot-app.ai.CreateNote: action start");
    let userAppToken: string;
    try {
      userAppToken = await getAppAuthToken(context);
    } catch (err) {
      // TODO: init app linking flow if not already linked
      console.error(`bot-app.message /notes: error ${err}`);
      return "You are not authenticated, please sign in to continue";
    }
    try {
      // Create the note, which will also trigger an update through the PubSub the user is listening to
      const response = await fetch(
        new URL(`https://${process.env.BOT_DOMAIN}/api/notes/create`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: userAppToken,
          },
          body: JSON.stringify({
            text: paramaters.text,
            color: "yellow",
            threadId: context.activity.conversation.id,
          }),
        }
      );
      const body = await response.json();
      if (response.status !== 200) {
        throw new Error(body.error);
      }
      await context.sendActivity({
        attachments: [noteCard(body.note)],
      });
    } catch (err) {
      console.error(`bot-app.message /notes: error ${err}`);
      return "Error getting notes";
    }
    return "Here you go! What else can I help you with?";
  }
);

botApp.ai.action(
  "SummarizeNotes",
  async (
    context: TurnContext,
    state: ApplicationTurnState,
    paramaters: {
      text: string | undefined;
    }
  ) => {
    console.log("ot-app.ai.GetNotes: action start");
    let userAppToken: string;
    try {
      userAppToken = await getAppAuthToken(context);
    } catch (err) {
      // TODO: init app linking flow if not already linked
      console.error(`bot-app.ai.GetNotes: error ${err}`);
      return "You are not authenticated, please sign in to continue";
    }
    try {
      // Get user notes
      const response = await fetch(
        new URL(`https://${process.env.BOT_DOMAIN}/api/notes/list/my`),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: userAppToken,
          },
        }
      );
      const body = await response.json();
      if (response.status !== 200) {
        throw new Error(body.error);
      }
      return `INSTRUCTIONS: Summarize the NOTES ${
        paramaters.text
          ? `with the following search text: ${paramaters.text}`
          : ""
      }.`;
    } catch (err) {
      console.error(`bot-app.message /notes: error ${err}`);
      return "Error getting notes";
    }
  }
);

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
      "app.adaptiveCards.actionExecute signout: start with state",
      JSON.stringify(state)
    );
    await botApp.authentication.signOutUser(context, state);
    console.log(
      "app.adaptiveCards.actionExecute signout: success",
      JSON.stringify(state)
    );

    const initialCard = createSignInCard();

    return initialCard.content;
  }
);

// Auth handlers

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

/**
 * Sends a message for a given thread reference identifier.
 *
 * @param threadReferenceId use userAadId for personal scope, and conversation id for other scopes
 * @param activityOrText activity to send
 * @returns void promise
 */
export async function sendMessage(
  threadReferenceId: string,
  activityOrText: string | Partial<Activity>
) {
  const conversationReference = await findReference(threadReferenceId);
  if (!conversationReference) {
    throw new Error("bot-app.ts sendMessage: unable to find threadReferenceId");
  }
  console.log("bot-app.ts sendMessage: sending message");
  return await botAdapter.continueConversationAsync(
    process.env.BOT_ID!,
    conversationReference,
    async (context: TurnContext) => {
      await context.sendActivity(activityOrText);
    }
  );
}

/**
 * Store the conversation reference so that we can send "proactive notifications" later.
 *
 * @param activity recent message activity to store a reference to
 */
async function addConversationReference(activity: Activity): Promise<void> {
  const conversationReference = TurnContext.getConversationReference(activity);
  if (!conversationReference.conversation) return;
  console.log(
    "bot-app.ts addConversationReference: adding reference for conversation reference",
    JSON.stringify(conversationReference.conversation)
  );
  if (conversationReference.conversation.conversationType === "personal") {
    // For personal scope we use the user id, because personal tabs don't include `chat` in `app.getContext()`
    // The bot will never have an aadObjectId
    const userAadId =
      activity.from.aadObjectId ?? activity.recipient.aadObjectId;
    if (!userAadId) {
      console.error(
        "bot-app.ts addConversationReference: unable to add reference for user that doesn't have aadObjectId"
      );
      return;
    }
    await upsertReference(userAadId, conversationReference);
    console.log(
      "bot-app.ts addConversationReference: upserted conversation reference"
    );
    return;
  }
  await upsertReference(
    conversationReference.conversation.id,
    conversationReference
  );
  console.log(
    "bot-app.ts addConversationReference: upserted conversation reference"
  );
}
