// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
  ActivityTypes,
  ConfigurationServiceClientCredentialFactory,
  MemoryStorage,
  TurnContext,
  Response as BotResponse,
  Attachment,
} from "botbuilder";

import {
  ApplicationBuilder,
  TurnState,
  TeamsAdapter,
  AuthError,
} from "@microsoft/teams-ai";
import { NextRequest, NextResponse } from "next/server";
import { createUserProfileCard, createSignInCard } from "./cards";
import { getUserDetailsFromGraph } from "./graph";

interface ConversationState {
  count: number;
}
type ApplicationTurnState = TurnState<ConversationState>;
const USE_CARD_AUTH = process.env.AUTH_TYPE === "card";

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new TeamsAdapter(
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
adapter.onTurnError = onTurnErrorHandler;

// Define storage and application
const storage = new MemoryStorage();
const app = new ApplicationBuilder<ApplicationTurnState>()
  .withStorage(storage)
  .withAuthentication(adapter, {
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
app.message(
  "/reset",
  async (context: TurnContext, state: ApplicationTurnState) => {
    state.deleteConversationState();
    await context.sendActivity(
      `Ok I've deleted the current conversation state.`
    );
  }
);

app.message(
  "/signout",
  async (context: TurnContext, state: ApplicationTurnState) => {
    await app.authentication.signOutUser(context, state);

    // Echo back users request
    await context.sendActivity(`You have signed out`);
  }
);

// Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
app.activity(
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
        card = createUserProfileCard(
          user.displayName,
          user.profilePhoto
        );
      } else {
        console.log("app.activity .Message: no token in _state, sending sign in card");
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
app.adaptiveCards.actionExecute(
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
    return user.displayName;

    // return profileCard.content;
  }
);

// Handle sign out adaptive card button click
app.adaptiveCards.actionExecute(
  "signout",
  async (context: TurnContext, state: ApplicationTurnState) => {
    console.log("app.adaptiveCards.actionExecute signout: start");
    await app.authentication.signOutUser(context, state);
    console.log("app.adaptiveCards.actionExecute signout: success");

    const initialCard = createSignInCard();

    return initialCard.content;
  }
);

// Auth handlers

if (!USE_CARD_AUTH) {
  app.authentication
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

  app.authentication
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

interface ResponseHolder {
  status: number;
  body: unknown;
  headers: Headers;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log(
    "POST /api/messages for w/ env variables",
    process.env.BOT_ID,
    process.env.BOT_PASSWORD
  );
  const resPromise: Promise<ResponseHolder> = new Promise<ResponseHolder>(
    async (resolve, reject) => {
      let processed = false;
      let ended = false;
      let status: number = 500;
      let body: unknown;
      let headers: Headers = new Headers();
      const res: BotResponse = {
        socket: undefined,
        end: function (): unknown {
          console.log("BotResponse.end");
          ended = true;
          if (processed) {
            resolve({
              status,
              body,
              headers,
            });
          }
          return;
        },
        header: function (name: string, value: unknown): unknown {
          headers.append(
            name,
            typeof value === "string" ? value : JSON.stringify(value)
          );
          return;
        },
        send: function (sendBody?: unknown): unknown {
          console.log("BotResponse.send");
          body = sendBody;
          return;
        },
        status: function (code: number): unknown {
          console.log("BotResponse.status code:", code);
          status = code;
          return;
        },
      };
      try {
        console.log("parsing req.json()");
        const body = await req.json();
        const headersRecord: Record<string, string> = {};
        req.headers.forEach((value, key) => {
          headersRecord[key] = value;
        });
        // Route received a request to adapter for processing
        console.log("calling adapter.process()");
        await adapter.process(
          {
            body,
            headers: headersRecord,
            method: req.method,
          },
          res,
          async (context) => {
            // Dispatch to application for routing
            console.log("calling app.run(context)");
            const dispatched = await app.run(context);
            console.log(`finished app.run(context), dispatched: ${dispatched}`);
          }
        );
        processed = true;
        if (ended) {
          resolve({
            status,
            body,
            headers,
          });
        }
      } catch (err) {
        reject(err);
      }
    }
  );

  try {
    let resHolder = await resPromise;
    return NextResponse.json(resHolder.body, {
      status: resHolder.status,
      headers: resHolder.headers,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? {
                message: err.message,
              }
            : {
                message: "An unknown error occurred",
              },
      },
      { status: 500 }
    );
  }
}
