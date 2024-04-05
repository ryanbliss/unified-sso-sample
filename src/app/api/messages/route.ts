// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
  ActivityTypes,
  ConfigurationServiceClientCredentialFactory,
  MemoryStorage,
  TurnContext,
  Response as BotResponse,
} from "botbuilder";

import {
  ApplicationBuilder,
  TurnState,
  TeamsAdapter,
} from "@microsoft/teams-ai";
import { NextRequest, NextResponse } from "next/server";

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
const app = new ApplicationBuilder()
  .withStorage(storage)
  //   .withAuthentication(adapter, {
  //     settings: {
  //       graph: {
  //         connectionName: process.env.OAUTH_CONNECTION_NAME ?? "",
  //         title: "Sign in",
  //         text: "Please sign in to use the bot.",
  //         endOnInvalidMessage: true,
  //         tokenExchangeUri: process.env.TOKEN_EXCHANGE_URI ?? "", // this is required for SSO
  //         enableSso: true,
  //       },
  //     },
  //     autoSignIn: (context: TurnContext) => {
  //       // Disable auto sign in for message activities
  //       if (context.activity.type == ActivityTypes.Message) {
  //         return Promise.resolve(false);
  //       }
  //       return Promise.resolve(true);
  //     },
  //   })
  .build();

// Handle message activities
app.activity(
  ActivityTypes.Message,
  async (context: TurnContext, _state: TurnState) => {
    await context.sendActivity("hello world");
  }
);

interface ResponseHolder {
  status: number;
  body: unknown;
  headers: Headers;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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
          body = sendBody;
          return;
        },
        status: function (code: number): unknown {
          status = code;
          return;
        },
      };
      try {
        const body = await req.json();
        const headersRecord: Record<string, string> = {};
        req.headers.forEach((value, key) => {
          headersRecord[value] = key;
        });
        // Route received a request to adapter for processing
        await adapter.process(
          {
            body,
            headers: headersRecord,
            method: req.method,
          },
          res,
          async (context) => {
            // Dispatch to application for routing
            await app.run(context);
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
