// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import { Response as BotResponse } from "botbuilder";
import { NextRequest, NextResponse } from "next/server";
import { botAdapter, botApp } from "@/server/bot/bot-app";
import { prepareBotPromptFiles } from "@/server/bot/fs-utils";

interface ResponseHolder {
  status: number;
  body: unknown;
  headers: Headers;
  info: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Next.js is a bit of a pain to get working with these static files.
  // It chunks everything it needs as it needs it.
  // teams-ai requires these files be static at a set path, so this should be a fine workaround for now.
  prepareBotPromptFiles();
  console.log(
    "POST /api/messages for w/ env variables",
    process.env.BOT_ID,
    process.env.BOT_PASSWORD
  );
  const resPromise: Promise<ResponseHolder> = new Promise<ResponseHolder>(
    async (resolve, reject) => {
      let ended = false;
      let status: number = 500;
      let resBody: unknown;
      let headers: Headers = new Headers();
      const res: BotResponse = {
        socket: undefined,
        end: function (): unknown {
          console.log("BotResponse.end with body", JSON.stringify(resBody));
          ended = true;
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
          console.log("BotResponse.send with body", JSON.stringify(sendBody));
          resBody = sendBody;
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
        await botAdapter.process(
          {
            body,
            headers: headersRecord,
            method: req.method,
          },
          res,
          async (context) => {
            // Dispatch to application for routing
            console.log("calling app.run(context)");
            const dispatched = await botApp.run(context);
            console.log(`finished app.run(context), dispatched: ${dispatched}`);
          }
        );
        if (!ended) {
          throw new Error(
            "Trying to resolve ResponseHolder before ended was called"
          );
        }
        resolve({
          status,
          body: resBody,
          headers,
          info: "postProcess",
        });
      } catch (err) {
        reject(err);
      }
    }
  );

  try {
    let resHolder = await resPromise;
    console.log(
      "route returning NextResponse with body",
      JSON.stringify(resHolder.body),
      "headers",
      JSON.stringify(resHolder.headers),
      "info",
      resHolder.info
    );
    return NextResponse.json(resHolder.body ?? {}, {
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
