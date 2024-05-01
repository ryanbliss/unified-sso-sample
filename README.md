## Intro

This application aims to show how to leverage AAD tokens granted via Microsoft Teams Platform can be used to authenticate users into this app's custom user identity system. It is a simple sticky notes app, allowing users to create notes via the bot and use AI to recommend improvements. It shows how a Teams bot and tab can work seamlessly together from a user-experience POV. I do not shy away from the complexities of our platform. This sample helped me understand Teams auth, bot, and tab capabilities a lot better -- hopefully it can do the same for you!

This is a [Next.js](https://nextjs.org/) project, which uses React server components and serverless API functions in one application. I know, what kind of Microsoft employee am I?

## Getting Started

This app is not really optimized for local development. I recommend forking this library and deploying it to [Vercel](https://vercel.com), if you want to test it.

### Setting up environment

This project uses the following services:
- [Vercel](https://vercel.com): Next.js app deployment
- [MongoDB](https://mongodb.com): Managed database deplyment
- [OpenAI](https://openai.com/product): It's 2024, don't pretend like you don't know
- [Azure AAD + Bot](https://learn.microsoft.com/microsoftteams/platform/tabs/how-to/authentication/tab-sso-register-aad): AAD app registration
- [Azure PubSub](https://learn.microsoft.com/azure/azure-web-pubsub/overview): Send commands from my server to the client

This is a bit messy on the dependency front, so I apologize in advance. I will try and integrate it with Teams Toolkit at some point in the future, likely replacing Vercel with Azure Static Web Apps, MongoDB with Azure CosmosDB, and OpenAI with Azure OpenAI.

Copy and paste the `.env.template` file and replace it with `.env.local` and add your values to the "Environment variables" tab of your Vercel project settings.

In addition, you should replace the [Teams app manifest](./teams-app-package/manifest.json) `id`, `staticTabs[1].contentUrl`, `bots[0].id`, `validDomains[0]`, `webApplicationInfo.id`, and `webApplicationInfo.resource` with your own values.

### Understanding project structure

Since both the server and client code are combined, Next.js has a bit of a different structure than you may have seen in the past. To better understand how this works, read their [Defining Routes docs](https://nextjs.org/docs/app/building-your-application/routing/defining-routes). Any page and/or API route is contained within the `src/app` folder.

For client-side code used only within "use client" pages, look in the `src/client` folder. This includes things like reusable React components, React context providers, hooks, and client-only utils.

For server-side files only referenced from "use server" React components and `/api` routes, look in the `src/server` folder. This includes the Teams bot files, MongoDB related files, Azure PubSub files, and server-only utils (e.g., auth utils).

For code that is shared across client and server files, look in the `src/shared` folder. This just includes base models shared across the server and client (e.g., responses from API requests).

### Running locally

If you really want to run locally, follow these instructions:
First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
