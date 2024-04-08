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
  .withAuthentication(adapter, {
    settings: {
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

// Handle message activities
app.activity(
  ActivityTypes.Message,
  async (context: TurnContext, _state: TurnState) => {
    console.log("sending message activity");
    await context.sendActivity("hello world");
  }
);

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
