// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
  ConfigurationServiceClientCredentialFactory,
  TurnContext,
  Activity,
  TaskModuleTaskInfo,
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
} from "@microsoft/teams-ai";
import { notesCard, noteCard, suggestionCard } from "./cards";
import {
  findReference,
  upsertReference,
} from "@/server/database/conversation-references";
import { MongoDBBotStorage } from "./MongoDBBotStorage";
import {
  getAppAuthToken,
  getIntelligentSuggestionActivity,
  getTeamsActivityThreadId,
  getValidatedAppAuthToken,
  sendAppSignInCard,
} from "./bot-utils";
import "./fs-utils";
import { setupBotDebugMessageHandlers } from "./bot-debug-handlers";
import { IAppJwtToken } from "@/server/utils/app-auth-utils";
import { isIUserClientState } from "@/shared/models/user-client-state";

interface ConversationState {
  count: number;
}
export type ApplicationTurnState = TurnState<ConversationState>;

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
  promptsFolder: path.join(process.cwd(), "./src/server/bot/prompts"),
});

const planner = new ActionPlanner({
  model,
  prompts,
  defaultPrompt: "sequence",
});

// Define storage and application
export const botStorage = new MongoDBBotStorage();
export const botApp = new ApplicationBuilder<ApplicationTurnState>()
  .withStorage(botStorage)
  .withAIOptions({
    planner,
  })
  .withAuthentication(botAdapter, {
    autoSignIn: (context: TurnContext) => {
      // Disable auto sign in for specific debug messages
      const activity = context.activity;
      if (activity.text === "/collab-stage") {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    },
    settings: {
      graph: {
        connectionName: process.env.OAUTH_CONNECTION_NAME ?? "",
        title: "Sign in",
        text: "Please sign in to use the bot.",
        endOnInvalidMessage: true,
        tokenExchangeUri: process.env.TOKEN_EXCHANGE_URI ?? "", // this is required for SSO
        enableSso: true,
      },
    },
  })
  .build();

/**
 * Message handlers
 */

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

// Some additional bot message handlers for commands that can be helpful during debugging
setupBotDebugMessageHandlers();

/**
 * AI handlers
 */

// Get app user's notes
botApp.ai.action(
  "GetNotes",
  async (
    context: TurnContext,
    state: ApplicationTurnState,
    paramaters: undefined
  ) => {
    console.log("ot-app.ai.GetNotes: action start");
    async function handleAction() {
      let userAppToken: string;
      try {
        userAppToken = await getAppAuthToken(context);
      } catch (err) {
        console.error(`bot-app.ai.GetNotes: error ${err}`);
        // TODO: probably shouldn't show this in a group context
        await sendAppSignInCard(context);
        context.sendActivity("You are not authenticated, please sign in to continue");
        return;
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
          context.sendActivity(JSON.stringify(body.error));
          return;
        }
        await context.sendActivity({
          attachments: [notesCard(body.notes)],
        });
      } catch (err) {
        console.error(`bot-app.message /notes: error ${err}`);
        context.sendActivity("Error getting notes");
      }
    }
    handleAction();

    return "Okay, I'm finding your notes.";
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
    console.log("bot-app.ai.CreateNote: action start");
    async function handleAction() {
      let userAppToken: string;
      try {
        userAppToken = await getAppAuthToken(context);
      } catch (err) {
        console.error(`bot-app.message /notes: error ${err}`);
        // TODO: probably shouldn't show this in a group context
        await sendAppSignInCard(context);
        return;
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
          context.sendActivity(JSON.stringify(body.error));
          return;
        }
        await context.sendActivity({
          attachments: [noteCard(body.note)],
        });
      } catch (err) {
        console.error(`bot-app.message /notes: error ${err}`);
        context.sendActivity("Error getting notes");
      }
    }
    handleAction();
    return "Okay, I am creating a note...";
  }
);

// Create a new note
botApp.ai.action(
  "SuggestEdits",
  async (context: TurnContext, state: ApplicationTurnState) => {
    console.log("bot-app.ai.SuggestEdits: action start");
    async function handleAction() {
      let jwtPayload: IAppJwtToken;
      try {
        const payload = await getValidatedAppAuthToken(context);
        if (!payload) {
          context.sendActivity("Invalid token.");
          return;
        }
        jwtPayload = payload;
      } catch (err) {
        console.error(`bot-app.ai.SuggestEdits: error ${err}`);
        // TODO: probably shouldn't show this in a group context
        await sendAppSignInCard(context);
        return;
      }
      const threadId = getTeamsActivityThreadId(context.activity);
      const suggestionActivity = await getIntelligentSuggestionActivity(
        threadId,
        jwtPayload.user._id
      );
      if (!suggestionActivity) {
        context.sendActivity(
          "You are not currently editing any notes. Please start editing a note to continue."
        );
        return;
      }
      await context.sendActivity(suggestionActivity);
    }
    handleAction();
    return "Okay, give me a second please.";
  }
);

/**
 * Adaptive Card handlers
 */
botApp.adaptiveCards.actionExecute(
  "approve-suggestion",
  async (
    context: TurnContext,
    state: ApplicationTurnState,
    data: Record<string, any>
  ) => {
    console.log(
      "bot-app adaptiveCards.actionExecute approve-suggestion: data:",
      data
    );
    const clientState = data.clientState;
    if (!isIUserClientState(data.clientState)) {
      throw new Error(
        "data.clientState must be valid type of IUserClientState"
      );
    }
    let appToken: string;
    try {
      appToken = await getAppAuthToken(context);
    } catch (err) {
      console.error(
        `bot-app adaptiveCards.actionExecute approve-suggestion: error ${err}`
      );
      // TODO: probably shouldn't show this in a group context
      await sendAppSignInCard(context);
      return "You are not authenticated, please sign in to continue";
    }
    const response = await fetch(
      `https://${process.env.BOT_DOMAIN}/api/messages/update-client-state?sendPubSub=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: appToken,
        },
        body: JSON.stringify(clientState),
      }
    );
    const body = await response.json();
    if (response.status !== 200) {
      throw new Error(body.error);
    }
    const card = suggestionCard(data.clientState, true);
    return card.content;
  }
);

/**
 * Tasks
 */
botApp.taskModules.fetch("connect-account", async (context, state, data) => {
  console.log(
    `bot-app.ts taskModules.fetch("connect-account"): data`,
    JSON.stringify(data, null, 4)
  );
  const taskInfo: TaskModuleTaskInfo = {
    title: "Connect your Microsoft 365 account",
    height: "medium",
    width: "medium",
    url: `https://${process.env.BOT_DOMAIN}/connections`,
    fallbackUrl: `https://${process.env.BOT_DOMAIN}/connections`,
    completionBotId: process.env.BOT_ID,
  };
  return taskInfo;
});
botApp.taskModules.submit("connect-account", async (context, state, data) => {
  console.log(
    `bot-app.ts taskModules.submit("connect-account"): data`,
    JSON.stringify(data, null, 4)
  );
  await context.sendActivity("You are all set! Now, how can I help you today?");
  return undefined;
});

/**
 * Auth handlers
 */

botApp.authentication
  .get("graph")
  .onUserSignInSuccess(
    async (context: TurnContext, state: ApplicationTurnState) => {
      console.log(
        "bot-app graph onUserSignInSuccess.",
        `This is what you said before the AuthFlow started: ${context.activity.text}`
      );
      // Check if AAD user has a connected Unify app acount
      try {
        await getAppAuthToken(context);
        // Successfully logged in
        await context.sendActivity(
          `Welcome, ${context.activity.from.name}! You are all set. How can I help you today?`
        );
      } catch (err) {
        console.warn(
          `bot-app graph onUserSignInSuccess: no existing account found, ${err}`
        );
        // TODO: probably shouldn't show this in a group context
        await sendAppSignInCard(context);
      }
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
      console.error(
        "bot-app graph onSignInFailure.",
        `${error.message}, ${error.cause}`
      );
      // Failed to login
      await context.sendActivity("Failed to login");
      await context.sendActivity(`Error message: ${error.message}`);
    }
  );

/**
 * Proactive message handlers
 */

/**
 * Sends a message for a given thread reference identifier.
 *
 * @param threadReferenceId use userAadId for personal scope, and conversation id for other scopes
 * @param activityOrText activity to send
 * @returns void promise
 */
export async function sendProactiveMessage(
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
  // TODO: going to store multiple duplicate references...but it would be better to do this with a join table
  let promises: Promise<void>[] = [];
  if (conversationReference.conversation.conversationType === "personal") {
    const userAadId =
      activity.from.aadObjectId ?? activity.recipient.aadObjectId;
    if (!userAadId) {
      console.error(
        "bot-app.ts addConversationReference: unable to add reference for user that doesn't have aadObjectId"
      );
      return;
    }
    // For personal scope we use the user id as well, because personal tabs don't include `chat` in `app.getContext()`
    // The bot will never have an aadObjectId
    promises.push(upsertReference(userAadId, conversationReference));
    // For some reason, bots have a different conversationId format that is a: instead of 19:
    // But in teams-js in chat contexts it will return the standard 19:{userId}_{recipientId}@unq.gbl.spaces
    // TODO: figure out if other tenant environments (e.g., GCCH) use something different than @unq.gbl.spaces
    promises.push(
      upsertReference(getTeamsActivityThreadId(activity), conversationReference)
    );
  }
  // Store standard reference for all other thread types
  promises.push(
    upsertReference(
      conversationReference.conversation.id,
      conversationReference
    )
  );
  await Promise.all(promises);
  console.log(
    "bot-app.ts addConversationReference: upserted conversation reference"
  );
}
