import {
  ApplicationOptions,
  AuthenticationManager,
  ConversationUpdateEvents,
  FeedbackLoopData,
  MessageReactionEvents,
  TeamsMessageEvents,
  TurnEvents,
  TurnState,
} from "@microsoft/teams-ai";
import {
  Activity,
  ActivityTypes,
  BotAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConversationReference,
  FileConsentCardResponse,
  O365ConnectorCardActionQuery,
  ResourceResponse,
  TurnContext,
} from "botbuilder";
import {
  IConversationContext,
  isEmbedTurnContext,
} from "./turn-context-extended";
import { IContinueConversation, TContinueConversation } from "../shared";
import { Embed } from "./Embed";
import { findReference } from "@/server/database/conversation-references";
import { AI } from "./AI";
import {
  deleteUserInSignInFlow,
  setSettingNameInContextActivityValue,
  setTokenInState,
  setUserInSignInFlow,
  userInSignInFlow,
} from "@microsoft/teams-ai/lib/authentication/BotAuthenticationBase";
import { ReadReceiptInfo } from "botframework-connector";
import { AdaptiveCards } from "./AdaptiveCards";
import { Meetings } from "./Meetings";
import { MessageExtensions } from "./MessageExtensions";
import { TaskModules } from "./TaskModules";
import { Conversation } from "./Conversation";
import { User } from "./User";

/**
 * Function for handling an incoming request.
 * @template TState Type of the turn state.
 * @param context Context for the current turn of conversation with the user.
 * @param state Current turn state.
 * @returns A promise that resolves when the handler completes its processing.
 */
export type RouteHandler<TState extends TurnState> = (
  context: IConversationContext,
  state: TState
) => Promise<void>;

/**
 * A selector function for matching incoming activities.
 */
export type Selector = (context: IConversationContext) => Promise<boolean>;

/**
 * Function for selecting whether a route handler should be triggered.
 * @param context Context for the current turn of conversation with the user.
 * @returns A promise that resolves with a boolean indicating whether the route handler should be triggered.
 */
export type RouteSelector = Selector;

/**
 * @private
 */
const TYPING_TIMER_DELAY = 1000;

export class Application<TState extends TurnState = TurnState> {
  /**
   * FORKED VARIABLES
   */
  private readonly _options: ApplicationOptions<TState>;
  private readonly _routes: AppRoute<TState>[] = [];
  private readonly _invokeRoutes: AppRoute<TState>[] = [];
  private readonly _adaptiveCards: AdaptiveCards<TState>;
  private readonly _meetings: Meetings<TState>;
  private readonly _messageExtensions: MessageExtensions<TState>;
  private readonly _taskModules: TaskModules<TState>;
  private readonly _ai?: AI<TState>;
  private readonly _beforeTurn: ApplicationEventHandler<TState>[] = [];
  private readonly _afterTurn: ApplicationEventHandler<TState>[] = [];
  private readonly _authentication?: AuthenticationManager<TState>;
  private readonly _adapter?: BotAdapter;
  private _typingTimer: any;
  private readonly _startSignIn?: Selector;

  /**
   * NEW VARIABLES
   */
  public readonly embed: Embed<TState>;

  /**
   * Creates a new Application instance.
   * @param {ApplicationOptions<TState>} options Optional. Options used to configure the application.
   */
  public constructor(options?: Partial<ApplicationOptions<TState>>) {
    // FORKED
    this._options = {
      ...options,
      turnStateFactory:
        options?.turnStateFactory || (() => new TurnState() as TState),
      removeRecipientMention:
        options?.removeRecipientMention !== undefined
          ? options.removeRecipientMention
          : true,
      startTypingTimer:
        options?.startTypingTimer !== undefined
          ? options.startTypingTimer
          : true,
      longRunningMessages:
        options?.longRunningMessages !== undefined
          ? options.longRunningMessages
          : false,
    };

    // Create Adapter
    if (this._options.adapter) {
      this._adapter = this._options.adapter;
    }

    // Create AI component if configured with a planner
    if (this._options.ai) {
      this._ai = new AI(this._options.ai);
    }

    // Create OAuthPrompt if configured
    if (this._options.authentication) {
      this._startSignIn = createSignInSelector(
        this._options.authentication.autoSignIn
      );

      this._authentication = new AuthenticationManager(
        // TODO: fix typing
        this as any,
        this._options.authentication,
        this._options.storage
      );
    }

    this._adaptiveCards = new AdaptiveCards<TState>(this);
    this._messageExtensions = new MessageExtensions<TState>(this);
    this._meetings = new Meetings<TState>(this);
    this._taskModules = new TaskModules<TState>(this);

    // Validate long running messages configuration
    if (
      this._options.longRunningMessages &&
      !this._adapter &&
      !this._options.botAppId
    ) {
      throw new Error(
        `The Application.longRunningMessages property is unavailable because no adapter or botAppId was configured.`
      );
    }
    // NEW
    this.embed = new Embed(this._options);
  }

  /**
   * Dispatches an incoming activity to a handler registered with the application.
   * @remarks
   * This method should be called from your bot's "turn handler" (its primary message handler)
   *
   * ```JavaScript
   * server.post('/api/messages', async (req, res) => {
   *    await adapter.processActivity(req, res, async (context) => {
   *      await bot.run(context);
   *   });
   * });
   * ```
   * @param {TurnContext} turnContext Context class for the current turn of conversation with the user.
   * @returns {Promise<boolean>} True if the activity was successfully dispatched to a handler. False if no matching handlers could be found.
   */
  public async run(turnContext: TurnContext): Promise<boolean> {
    (turnContext as any).conversation = new Conversation<TState>(
      this,
      // Safe to cast because nothing happens on construction, but ensure all properties are set before calling any IConversationContext methods / getters
      turnContext as IConversationContext
    );
    // Safe to cast because nothing happens on construction, but ensure all properties are set before calling any IConversationContext methods / getters
    (turnContext as any).user = new User(turnContext as IConversationContext);
    if (isEmbedTurnContext(turnContext)) {
      return await this.embed.run(turnContext);
    }
    return await this.startLongRunningCall(turnContext, async (bContext) => {
      // Safe to cast because nothing happens on construction, but ensure all properties are set before calling any IConversationContext methods / getters
      (bContext as any).conversation = new Conversation<TState>(this, bContext as IConversationContext);
      // Safe to cast because nothing happens on construction, but ensure all properties are set before calling any IConversationContext methods / getters
      (bContext as any).user = new User(bContext as IConversationContext);
      const context = bContext as IConversationContext;
      // Start typing indicator timer
      this.startTypingTimer(context);
      try {
        // Remove @mentions
        if (
          this._options.removeRecipientMention &&
          context.activity.type == ActivityTypes.Message
        ) {
          context.activity.text = TurnContext.removeRecipientMention(
            context.activity
          );
        }

        // Load turn state
        const { storage, turnStateFactory } = this._options;
        const state = turnStateFactory();
        await state.load(context, storage);

        // Sign the user in
        // If user is in sign in flow, return the authentication setting name
        let settingName = userInSignInFlow(state);
        if (
          this._authentication &&
          ((await this._startSignIn?.(context)) || settingName)
        ) {
          if (!settingName) {
            // user was not in a sign in flow, but auto-sign in is enabled
            settingName = this.authentication.default;
          }

          // Sets the setting name in the context object. It is used in `signIn/verifyState` & `signIn/tokenExchange` route selectors.
          setSettingNameInContextActivityValue(context, settingName);

          const response = await this._authentication.signUserIn(
            context,
            state,
            settingName
          );

          if (response.status == "complete") {
            deleteUserInSignInFlow(state);
          }

          if (response.status == "pending") {
            // Save turn state
            // - Save authentication status in turn state
            await state.save(context, storage);
            return false;
          }

          // Invalid activities should be ignored for auth
          if (
            response.status == "error" &&
            response.cause != "invalidActivity"
          ) {
            deleteUserInSignInFlow(state);
            throw response.error;
          }
        }

        // Call beforeTurn event handlers
        if (!(await this.callEventHandlers(context, state, this._beforeTurn))) {
          // Save turn state
          // - This lets the bot keep track of why it ended the previous turn. It also
          //   allows the dialog system to be used before the AI system is called.
          await state.save(context, storage);
          return false;
        }

        // Populate {{$temp.input}}
        if (typeof state.temp.input != "string") {
          // Use the received activity text
          state.temp.input = context.activity.text;
        }

        // Download any input files
        if (
          Array.isArray(this._options.fileDownloaders) &&
          this._options.fileDownloaders.length > 0
        ) {
          const inputFiles = state.temp.inputFiles ?? [];
          for (let i = 0; i < this._options.fileDownloaders.length; i++) {
            const files = await this._options.fileDownloaders[i].downloadFiles(
              context,
              state
            );
            inputFiles.push(...files);
          }
          state.temp.inputFiles = inputFiles;
        }

        // Initialize {{$allOutputs}}
        if (state.temp.actionOutputs == undefined) {
          state.temp.actionOutputs = {};
        }

        // Run any RouteSelectors in this._invokeRoutes first if the incoming Teams activity.type is "Invoke".
        // Invoke Activities from Teams need to be responded to in less than 5 seconds.
        if (context.activity.type === ActivityTypes.Invoke) {
          for (let i = 0; i < this._invokeRoutes.length; i++) {
            const route = this._invokeRoutes[i];
            if (await route.selector(context)) {
              // Execute route handler
              await route.handler(context, state);

              // Call afterTurn event handlers
              if (
                await this.callEventHandlers(context, state, this._afterTurn)
              ) {
                // Save turn state
                await state.save(context, storage);
              }

              // End dispatch
              return true;
            }
          }
        }

        // All other ActivityTypes and any unhandled Invokes are run through the remaining routes.
        for (let i = 0; i < this._routes.length; i++) {
          const route = this._routes[i];
          if (await route.selector(context)) {
            // Execute route handler
            await route.handler(context, state);

            // Call afterTurn event handlers
            if (await this.callEventHandlers(context, state, this._afterTurn)) {
              // Save turn state
              await state.save(context, storage);
            }

            // End dispatch
            return true;
          }
        }

        // Call AI System if configured
        if (
          this._ai &&
          context.activity.type == ActivityTypes.Message &&
          context.activity.text
        ) {
          await this._ai.run(context, state);

          // Call afterTurn event handlers
          if (await this.callEventHandlers(context, state, this._afterTurn)) {
            // Save turn state
            await state.save(context, storage);
          }

          // End dispatch
          return true;
        }

        // Call afterTurn event handlers
        if (await this.callEventHandlers(context, state, this._afterTurn)) {
          // Save turn state
          await state.save(context, storage);
        }

        // activity wasn't handled
        return false;
      } finally {
        this.stopTypingTimer();
      }
    });
  }

  private get _credentialsFactory(): ConfigurationServiceClientCredentialFactory {
    const credentialsFactory = this.options.adapter?.credentialsFactory;
    if (
      !credentialsFactory ||
      !(
        credentialsFactory instanceof
        ConfigurationServiceClientCredentialFactory
      )
    ) {
      throw new Error(
        "Credentials factory is not of type ConfigurationServiceClientCredentialFactory"
      );
    }
    return credentialsFactory;
  }

  /**
   * Fluent interface for accessing Adaptive Card specific features.
   * @returns {AdaptiveCards<TState>} The AdaptiveCards instance.
   */
  public get adaptiveCards(): AdaptiveCards<TState> {
    return this._adaptiveCards;
  }

  /**
   * The bot's adapter.
   * @returns {BotAdapter} The bot's adapter that is configured for the application.
   */
  public get adapter(): BotAdapter {
    if (!this._adapter) {
      throw new Error(
        `The Application.adapter property is unavailable because it was not configured when creating the Application.`
      );
    }

    return this._adapter;
  }

  /**
   * Fluent interface for accessing AI specific features.
   * @remarks
   * This property is only available if the Application was configured with `ai` options. An
   * exception will be thrown if you attempt to access it otherwise.
   * @returns {AI<TState>} The AI instance.
   */
  public get ai(): AI<TState> {
    if (!this._ai) {
      throw new Error(
        `The Application.ai property is unavailable because no AI options were configured.`
      );
    }

    return this._ai;
  }

  /**
   * @template TState
   * Fluent interface for accessing Authentication specific features.
   * @description
   * This property is only available if the Application was configured with `authentication` options. An
   * exception will be thrown if you attempt to access it otherwise.
   * @returns {AuthenticationManager<TState>} The Authentication instance.
   */
  public get authentication(): AuthenticationManager<TState> {
    if (!this._authentication) {
      throw new Error(
        `The Application.authentication property is unavailable because no authentication options were configured.`
      );
    }

    return this._authentication;
  }

  /**
   * Fluent interface for accessing Message Extensions' specific features.
   * @returns {MessageExtensions<TState>} The MessageExtensions instance.
   */
  public get messageExtensions(): MessageExtensions<TState> {
    return this._messageExtensions;
  }

  /**
   * Fluent interface for accessing Meetings specific features.
   * @returns {Meetings<TState>} The Meetings instance.
   */
  public get meetings(): Meetings<TState> {
    return this._meetings;
  }

  /**
   * The application's configured options.
   * @returns {ApplicationOptions<TState>} The application's configured options.
   */
  public get options(): ApplicationOptions<TState> {
    return this._options;
  }

  /**
   * Fluent interface for accessing Task Module specific features.
   * @returns {TaskModules<TState>} The TaskModules instance.
   */
  public get taskModules(): TaskModules<TState> {
    return this._taskModules;
  }

  /**
   * Sets the bot's error handler
   * @param {Function} handler Function to call when an error is encountered.
   * @returns {this} The application instance for chaining purposes.
   */
  public error(
    handler: (context: TurnContext, error: Error) => Promise<void>
  ): this {
    if (this._adapter) {
      this._adapter.onTurnError = handler;
    }

    return this;
  }

  /**
   * Adds a new route to the application.
   * @remarks
   * Developers won't typically need to call this method directly as it's used internally by all
   * of the fluent interfaces to register routes for their specific activity types.
   *
   * Routes will be matched in the order they're added to the application. The first selector to
   * return `true` when an activity is received will have its handler called.
   *
   * Invoke-based activities receive special treatment and are matched separately as they typically
   * have shorter execution timeouts.
   * @param {RouteSelector} selector Function thats used to select a route. The function should return true to trigger the route.
   * @param {RouteHandler<TState>} handler Function to call when the route is triggered.
   * @param {boolean} isInvokeRoute Optional. Boolean indicating if the RouteSelector is for an activity that uses "invoke" which require special handling. Defaults to `false`.
   * @returns {this} The application instance for chaining purposes.
   */
  public addRoute(
    selector: RouteSelector,
    handler: RouteHandler<TState>,
    isInvokeRoute = false
  ): this {
    if (isInvokeRoute) {
      this._invokeRoutes.push({ selector, handler });
    } else {
      this._routes.push({ selector, handler });
    }
    return this;
  }

  /**
   * Handles incoming activities of a given type.
   * @param {string | RegExp | RouteSelector | string[] | RegExp[] | RouteSelector[]} type Name of the activity type to match or a regular expression to match against the incoming activity type. An array of type names or expression can also be passed in.
   * @param {(context: IConversationContext, state: TState) => Promise<void>} handler Function to call when the route is triggered.
   * @param {IConversationContext} handler.context The context object for the turn.
   * @param {TState} handler.state The state object for the turn.
   * @returns {this} The application instance for chaining purposes.
   */
  public activity(
    type: string | RegExp | RouteSelector | (string | RegExp | RouteSelector)[],
    handler: (context: IConversationContext, state: TState) => Promise<void>
  ): this {
    (Array.isArray(type) ? type : [type]).forEach((t) => {
      const selector = createActivitySelector(t);
      this.addRoute(selector, handler);
    });
    return this;
  }

  /**
   * Handles conversation update events.
   * @param {ConversationUpdateEvents} event Name of the conversation update event to handle.
   * @param {(context: IConversationContext, state: TState) => Promise<void>} handler Function to call when the route is triggered.
   * @param {IConversationContext} handler.context The context object for the turn.
   * @param {TState} handler.state The state object for the turn.
   * @returns {this} The application instance for chaining purposes.
   */
  public conversationUpdate(
    event: ConversationUpdateEvents,
    handler: (context: IConversationContext, state: TState) => Promise<void>
  ): this {
    if (typeof handler !== "function") {
      throw new Error(
        `ConversationUpdate 'handler' for ${event} is ${typeof handler}. Type of 'handler' must be a function.`
      );
    }

    const selector = createConversationUpdateSelector(event);
    this.addRoute(selector, handler);
    return this;
  }

  public messageEventUpdate(
    event: TeamsMessageEvents,
    handler: (context: IConversationContext, state: TState) => Promise<void>
  ): this {
    if (typeof handler !== "function") {
      throw new Error(
        `MessageUpdate 'handler' for ${event} is ${typeof handler}. Type of 'handler' must be a function.`
      );
    }

    const selector = createMessageEventUpdateSelector(event);
    this.addRoute(selector, handler);
    return this;
  }
  /**
   * @private
   * Starts a new "proactive" session with a conversation the bot is already a member of.
   * @remarks
   * Use of the method requires configuration of the Application with the `adapter.appId`
   * options. An exception will be thrown if either is missing.
   * @param context Context of the conversation to proactively message. This can be derived from either a TurnContext, ConversationReference, or Activity.
   * @param logic The bot's logic that should be run using the new proactive turn context.
   */
  private continueConversationAsync(
    context: TurnContext,
    logic: (context: TurnContext) => Promise<void>
  ): Promise<void>;
  private continueConversationAsync(
    conversationReference: Partial<ConversationReference>,
    logic: (context: TurnContext) => Promise<void>
  ): Promise<void>;
  private continueConversationAsync(
    activity: Partial<Activity>,
    logic: (context: TurnContext) => Promise<void>
  ): Promise<void>;
  private async continueConversationAsync(
    context: TurnContext | Partial<ConversationReference> | Partial<Activity>,
    logic: (context: TurnContext) => Promise<void>
  ): Promise<void> {
    if (!this._adapter) {
      throw new Error(
        `You must configure the Application with an 'adapter' before calling Application.continueConversationAsync()`
      );
    }

    if (!this.options.botAppId) {
      console.warn(
        `Calling Application.continueConversationAsync() without a configured 'botAppId'. In production environments a 'botAppId' is required.`
      );
    }

    // Identify conversation reference
    let reference: Partial<ConversationReference>;
    if (typeof (context as TurnContext).activity == "object") {
      reference = TurnContext.getConversationReference(
        (context as TurnContext).activity
      );
    } else if (typeof (context as Partial<Activity>).type == "string") {
      reference = TurnContext.getConversationReference(
        context as Partial<Activity>
      );
    } else {
      reference = context as Partial<ConversationReference>;
    }

    await this.adapter.continueConversationAsync(
      this._options.botAppId ?? "",
      reference,
      logic
    );
  }

  /**
   * Handles incoming messages with a given keyword.
   * @remarks
   * This method provides a simple way to have a bot respond anytime a user sends your bot a
   * message with a specific word or phrase.
   *
   * For example, you can easily clear the current conversation anytime a user sends "/reset":
   *
   * ```JavaScript
   * bot.message('/reset', async (context, state) => {
   *     await state.conversation.delete();
   *     await context.sendActivity(`I have reset your state.`);
   * });
   * ```
   * @param {string | RegExp | RouteSelector | string[] | RegExp[] | RouteSelector[]} keyword Substring of text or a regular expression to match against the text of an incoming message. An array of keywords or expression can also be passed in.
   * @param {(context: IConversationContext, state: TState) => Promise<void>} handler Function to call when the route is triggered.
   * @returns {this} The application instance for chaining purposes.
   */
  public message(
    keyword:
      | string
      | RegExp
      | RouteSelector
      | (string | RegExp | RouteSelector)[],
    handler: (context: IConversationContext, state: TState) => Promise<void>
  ): this {
    (Array.isArray(keyword) ? keyword : [keyword]).forEach((k) => {
      const selector = createMessageSelector(k);
      this.addRoute(selector, handler);
    });
    return this;
  }

  /**
   * Handles message reaction events.
   * @param {MessageReactionEvents | MessageReactionEvents[]} event Name of the message reaction event(s) to handle.
   * @param {(context: IConversationContext, state: TState) => Promise<void>} handler Function to call when the route is triggered.
   * @returns {this} The application instance for chaining purposes.
   */
  public messageReactions(
    event: MessageReactionEvents,
    handler: (context: IConversationContext, state: TState) => Promise<void>
  ): this {
    const selector = createMessageReactionSelector(event);
    this.addRoute(selector, handler);
    return this;
  }

  /**
   * Registers a handler to process when a file consent card is accepted by the user.
   * @param {(context: IConversationContext, state: TState, fileConsentResponse: FileConsentCardResponse) => Promise<void>} handler Function to call when the route is triggered.
   * @returns {this} The application instance for chaining purposes.
   */
  public fileConsentAccept(
    handler: (
      context: IConversationContext,
      state: TState,
      fileConsentResponse: FileConsentCardResponse
    ) => Promise<void>
  ): this {
    const selector = (context: IConversationContext): Promise<boolean> => {
      return Promise.resolve(
        context.activity.type === ActivityTypes.Invoke &&
          context.activity.name === "fileConsent/invoke" &&
          context.activity.value?.action === "accept"
      );
    };
    const handlerWrapper = async (
      context: IConversationContext,
      state: TState
    ) => {
      await handler(
        context,
        state,
        context.activity.value as FileConsentCardResponse
      );
      await context.sendActivity({
        type: ActivityTypes.InvokeResponse,
        value: { status: 200 },
      });
    };
    this.addRoute(selector, handlerWrapper, true);
    return this;
  }

  /**
   * Registers a handler to process when a file consent card is declined by the user.
   * @param {(context: IConversationContext, state: TState, fileConsentResponse: FileConsentCardResponse) => Promise<void>} handler Function to call when the route is triggered.
   * @returns {this} The application instance for chaining purposes.
   */
  public fileConsentDecline(
    handler: (
      context: IConversationContext,
      state: TState,
      fileConsentResponse: FileConsentCardResponse
    ) => Promise<void>
  ): this {
    const selector = (context: IConversationContext): Promise<boolean> => {
      return Promise.resolve(
        context.activity.type === ActivityTypes.Invoke &&
          context.activity.name === "fileConsent/invoke" &&
          context.activity.value?.action === "decline"
      );
    };
    const handlerWrapper = async (
      context: IConversationContext,
      state: TState
    ) => {
      await handler(
        context,
        state,
        context.activity.value as FileConsentCardResponse
      );
      await context.sendActivity({
        type: ActivityTypes.InvokeResponse,
        value: { status: 200 },
      });
    };
    this.addRoute(selector, handlerWrapper, true);
    return this;
  }

  /**
   * Registers a handler to process when a O365 Connector Card Action activity is received from the user.
   * @param {(context: IConversationContext, state: TState, query: O365ConnectorCardActionQuery) => Promise<void>} handler Function to call when the route is triggered.
   * @returns {this} The application instance for chaining purposes.
   */
  public O365ConnectorCardAction(
    handler: (
      context: TurnContext,
      state: TState,
      query: O365ConnectorCardActionQuery
    ) => Promise<void>
  ): this {
    const selector = (context: IConversationContext): Promise<boolean> => {
      return Promise.resolve(
        context.activity.type === ActivityTypes.Invoke &&
          context.activity.name === "actionableMessage/executeAction"
      );
    };
    const handlerWrapper = (context: IConversationContext, state: TState) => {
      return handler(
        context,
        state,
        context.activity.value as O365ConnectorCardActionQuery
      );
    };
    this.addRoute(selector, handlerWrapper, true);
    return this;
  }

  /**
   * Registers a handler to handoff conversations from one copilot to another.
   * @param {(context: IConversationContext, state: TState, continuation: string) => Promise<void>} handler Function to call when the route is triggered.
   * @returns {this} The application instance for chaining purposes.
   */
  public handoff(
    handler: (
      context: IConversationContext,
      state: TState,
      continuation: string
    ) => Promise<void>
  ): this {
    const selector = (context: IConversationContext): Promise<boolean> => {
      return Promise.resolve(
        context.activity.type === ActivityTypes.Invoke &&
          context.activity.name === "handoff/action"
      );
    };
    const handlerWrapper = async (
      context: IConversationContext,
      state: TState
    ) => {
      await handler(context, state, context.activity.value!.continuation);
      await context.sendActivity({
        type: ActivityTypes.InvokeResponse,
        value: { status: 200 },
      });
    };
    this.addRoute(selector, handlerWrapper, true);
    return this;
  }
  /**
   * Registers a handler for feedbackloop events when a user clicks the thumbsup or thumbsdown button on a response from AI. enable_feedback_loop must be set to true in the AI Module.
   * @param {(context: IConversationContext, state: TState, feedbackLoopData: FeedbackLoopData) => Promise<void>} handler - Function to call when the route is triggered
   * @returns {this} The application instance for chaining purposes.
   */
  public feedbackLoop(
    handler: (
      context: IConversationContext,
      state: TState,
      feedbackLoopData: FeedbackLoopData
    ) => Promise<void>
  ): this {
    const selector = (context: IConversationContext): Promise<boolean> => {
      return Promise.resolve(
        context.activity.type === ActivityTypes.Invoke &&
          context.activity.name === "message/submitAction" &&
          context.activity.value.actionName === "feedback"
      );
    };

    const handlerWrapper = async (
      context: IConversationContext,
      state: TState
    ) => {
      const feedback: FeedbackLoopData = {
        ...context.activity.value,
        replyToId: context.activity.replyToId,
      };
      await handler(context, state, feedback);
      await context.sendActivity({
        type: ActivityTypes.InvokeResponse,
        value: { status: 200 },
      });
    };
    this.addRoute(selector, handlerWrapper, true);
    return this;
  }

  /**
   * Sends a proactive activity to an existing conversation the bot is a member of.
   * @remarks
   * This method provides a simple way to send a proactive message to a conversation the bot is a member of.
   *
   * Use of the method requires you configure the Application with the `adapter.appId`
   * options. An exception will be thrown if either is missing.
   * @param context Context of the conversation to proactively message. This can be derived from either a TurnContext, ConversationReference, or Activity.
   * @param activityOrText Activity or message to send to the conversation.
   * @param speak Optional. Text to speak for channels that support voice.
   * @param inputHint Optional. Input hint for channels that support voice.
   * @returns A Resource response containing the ID of the activity that was sent.
   */
  public sendProactiveActivity(
    context: TurnContext,
    activityOrText: string | Partial<Activity>,
    speak?: string,
    inputHint?: string
  ): Promise<ResourceResponse | undefined>;
  public sendProactiveActivity(
    conversationReference: Partial<ConversationReference>,
    activityOrText: string | Partial<Activity>,
    speak?: string,
    inputHint?: string
  ): Promise<ResourceResponse | undefined>;
  public sendProactiveActivity(
    activity: Partial<Activity>,
    activityOrText: string | Partial<Activity>,
    speak?: string,
    inputHint?: string
  ): Promise<ResourceResponse | undefined>;
  public async sendProactiveActivity(
    context: TurnContext | Partial<ConversationReference> | Partial<Activity>,
    activityOrText: string | Partial<Activity>,
    speak?: string,
    inputHint?: string
  ): Promise<ResourceResponse | undefined> {
    let response: ResourceResponse | undefined;
    await this.continueConversationAsync(context, async (ctx) => {
      response = await ctx.sendActivity(activityOrText, speak, inputHint);
    });

    return response;
  }

  /**
   * Manually start a timer to periodically send "typing" activities.
   * @remarks
   * The timer waits 1000ms to send its initial "typing" activity and then send an additional
   * "typing" activity every 1000ms. The timer will automatically end once an outgoing activity
   * has been sent. If the timer is already running or the current activity, is not a "message"
   * the call is ignored.
   * @param {IConversationContext} context The context for the current turn with the user.
   */
  public startTypingTimer(context: IConversationContext): void {
    if (context.activity.type == ActivityTypes.Message && !this._typingTimer) {
      // Listen for outgoing activities
      context.onSendActivities((context, activities, next) => {
        // Listen for any messages to be sent from the bot
        if (timerRunning) {
          for (let i = 0; i < activities.length; i++) {
            if (activities[i].type == ActivityTypes.Message) {
              // Stop the timer
              this.stopTypingTimer();
              timerRunning = false;
              break;
            }
          }
        }

        return next();
      });

      let timerRunning = true;
      const onTimeout = async () => {
        try {
          // Send typing activity
          await context.sendActivity({ type: ActivityTypes.Typing });
        } catch (err) {
          // Seeing a random proxy violation error from the context object. This is because
          // we're in the middle of sending an activity on a background thread when the turn ends.
          // The context object throws when we try to update "this.responded = true". We can just
          // eat the error but lets make sure our states cleaned up a bit.
          this._typingTimer = undefined;
          timerRunning = false;
        }

        // Restart timer
        if (timerRunning) {
          this._typingTimer = setTimeout(onTimeout, TYPING_TIMER_DELAY);
        }
      };
      this._typingTimer = setTimeout(onTimeout, TYPING_TIMER_DELAY);
    }
  }

  /**
   * Manually stop the typing timer.
   * @remarks
   * If the timer isn't running nothing happens.
   */
  public stopTypingTimer(): void {
    if (this._typingTimer) {
      clearTimeout(this._typingTimer);
      this._typingTimer = undefined;
    }
  }

  /**
   * Registers a turn event handler.
   * @remarks
   * Turn events let you do something before or after a turn is run. Returning false from
   * `beforeTurn` lets you prevent the turn from running and returning false from `afterTurn`
   * lets you prevent the bots state from being saved.
   *
   * Returning false from `beforeTurn` does result in the bots state being saved which lets you
   * track the reason why the turn was not processed. It also means you can use `beforeTurn` as
   * a way to call into the dialog system. For example, you could use the OAuthPrompt to sign the
   * user in before allowing the AI system to run.
   * @param {TurnEvents | TurnEvents[]} event - Name of the turn event to handle.
   * @param {(context: IConversationContext, state: TState) => Promise<boolean>} handler - Function to call when the event is triggered.
   * @returns {this} The application instance for chaining purposes.
   */
  public turn(
    event: TurnEvents | TurnEvents[],
    handler: (context: IConversationContext, state: TState) => Promise<boolean>
  ): this {
    (Array.isArray(event) ? event : [event]).forEach((e) => {
      switch (event) {
        case "beforeTurn":
        default:
          this._beforeTurn.push(handler);
          break;
        case "afterTurn":
          this._afterTurn.push(handler);
          break;
      }
    });
    return this;
  }

  /**
   * Adds a handler for Teams' readReceiptInfo event
   * @param {(context: IConversationContext, state: TState, readReceiptInfo: ReadReceiptInfo) => Promise<boolean>} handler Function to call when the event is triggered.
   * @returns {this} The application instance for chaining purposes.
   */
  public teamsReadReceipt(
    handler: (
      context: IConversationContext,
      state: TState,
      readReceiptInfo: ReadReceiptInfo
    ) => Promise<void>
  ): this {
    const selector = (context: IConversationContext): Promise<boolean> => {
      return Promise.resolve(
        context.activity.type === ActivityTypes.Event &&
          context.activity.channelId === "msteams" &&
          context.activity.name === "application/vnd.microsoft/readReceipt"
      );
    };

    const handlerWrapper = (
      context: IConversationContext,
      state: TState
    ): Promise<void> => {
      const readReceiptInfo = context.activity.value as ReadReceiptInfo;
      return handler(context, state, readReceiptInfo);
    };

    this.addRoute(selector, handlerWrapper);

    return this;
  }

  /**
   * Calls the given event handlers with the given context and state.
   * @param {IConversationContext} context - The context for the current turn with the user.
   * @param {TState} state - The current state of the conversation.
   * @param {ApplicationEventHandler<TState>[]} handlers - The event handlers to call.
   * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the event handlers completed successfully.
   * @private
   */
  private async callEventHandlers(
    context: IConversationContext,
    state: TState,
    handlers: ApplicationEventHandler<TState>[]
  ): Promise<boolean> {
    for (let i = 0; i < handlers.length; i++) {
      const continueExecution = await handlers[i](context, state);
      if (!continueExecution) {
        return false;
      }
    }

    // Continue execution
    return true;
  }

  /**
   * Calls the given handler with the given context, either directly or by continuing the conversation
   * if the message is a long-running message.
   * @param {TurnContext} context - The context for the current turn with the user.
   * @param {(context: TurnContext) => Promise<boolean>} handler - The handler function to call.
   * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the handler completed successfully.
   * @private
   */
  private startLongRunningCall(
    context: TurnContext,
    handler: (context: TurnContext) => Promise<boolean>
  ): Promise<boolean> {
    /**
     * If the message is a long-running message, continue the conversation
     * and call the handler with the new context.
     */
    if (
      context.activity.type == ActivityTypes.Message &&
      this._options.longRunningMessages
    ) {
      return new Promise<boolean>((resolve, reject) => {
        this.continueConversationAsync(context, async (ctx) => {
          try {
            // Copy original activity to new context
            for (const key in context.activity) {
              (ctx.activity as any)[key] = (context.activity as any)[key];
            }

            // Call handler
            const result = await handler(ctx);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      });
    } else {
      // Call handler directly
      return handler(context);
    }
  }

  /**
   * If the user is signed in, get the access token. If not, triggers the sign in flow for the provided authentication setting name
   * and returns. In this case, the bot should end the turn until the sign in flow is completed.
   * @summary
   * Use this method to get the access token for a user that is signed in to the bot.
   * If the user isn't signed in, this method starts the sign-in flow.
   * The bot should end the turn in this case until the sign-in flow completes and the user is signed in.
   * @param {TurnContext} context - The context for the current turn with the user.
   * @param {TState} state - The current state of the conversation.
   * @param {string} settingName The name of the authentication setting.
   * @returns {string | undefined} The token for the user if they are signed in, otherwise undefined.
   */
  public async getTokenOrStartSignIn(
    context: TurnContext,
    state: TState,
    settingName: string
  ): Promise<string | undefined> {
    const token = await this.authentication
      .get(settingName)
      .isUserSignedIn(context);

    if (token) {
      setTokenInState(state, settingName, token);
      deleteUserInSignInFlow(state);
      return token;
    }

    if (!userInSignInFlow(state)) {
      // set the setting name in the user state so that we know the user is in the sign in flow
      setUserInSignInFlow(state, settingName);
    } else {
      deleteUserInSignInFlow(state);
      throw new Error(
        "Invalid state - cannot start sign in when already started"
      );
    }

    const response = await this.authentication.signUserIn(
      context,
      state,
      settingName
    );

    if (response.status == "error") {
      const message =
        response.cause == "invalidActivity"
          ? `User is not signed in and cannot start sign in flow for this activity: ${response.error}`
          : `${response.error}`;
      throw new Error(
        `Error occured while trying to authenticate user: ${message}`
      );
    }

    if (response.status == "complete") {
      deleteUserInSignInFlow(state);
      return state.temp.authTokens[settingName];
    }

    if (response.status == "pending") {
      return;
    }
  }

  public async continueConversation(
    conversationSelector: TContinueConversation,
    logic: (context: IConversationContext, state: TState) => Promise<void>
  ): Promise<void> {
    const { type, id, teamId } = conversationSelector as IContinueConversation;
    if (type === "channel" && !teamId) {
      throw new Error(
        "Application.continueConversationAsync: teamId must be provided when continuing a channel conversation"
      );
    }
    const conversationReference = await findReference(id);
    await this.adapter.continueConversationAsync(
      this._credentialsFactory.appId!,
      conversationReference,
      async (context: TurnContext) => {
        const { storage, turnStateFactory } = this._options;
        const state = turnStateFactory();
        await state.load(context, storage);
        // safe to cast because nothing happens right upon constructing the conversation, but it is still a hack
        (context as any).conversation = new Conversation(this, context as IConversationContext);
        (context as any).user = new User(context as IConversationContext);
        await logic(context as IConversationContext, state);
      }
    );
  }
}

/**
 * FORKED PRIVATE STUFF
 */
/**
 * @private
 */
interface AppRoute<TState extends TurnState> {
  selector: RouteSelector;
  handler: RouteHandler<TState>;
}

/**
 * @param {string | RegExp | RouteSelector} type The type of activity to match. Can be a string, RegExp, or RouteSelector function.
 * @returns {RouteSelector} A RouteSelector function that matches the given activity type.
 * @private
 */
function createActivitySelector(
  type: string | RegExp | RouteSelector
): RouteSelector {
  if (typeof type == "function") {
    // Return the passed in selector function
    return type;
  } else if (type instanceof RegExp) {
    // Return a function that matches the activities type using a RegExp
    return (context: TurnContext) => {
      return Promise.resolve(
        context?.activity?.type ? type.test(context.activity.type) : false
      );
    };
  } else {
    // Return a function that attempts to match type name
    const typeName = type.toString().toLocaleLowerCase();
    return (context: TurnContext) => {
      return Promise.resolve(
        context?.activity?.type
          ? context.activity.type.toLocaleLowerCase() === typeName
          : false
      );
    };
  }
}

/**
 * Creates a route selector function that matches a conversation update event.
 * @param {ConversationUpdateEvents} event The conversation update event to match against.
 * @returns {RouteSelector} A route selector function that returns true if the activity is a conversation update event and matches the specified event type.
 * @private
 */
function createConversationUpdateSelector(
  event: ConversationUpdateEvents
): RouteSelector {
  switch (event) {
    case "channelCreated":
    case "channelDeleted":
    case "channelRenamed":
    case "channelRestored":
      /**
       * @param {TurnContext} context The context object for the current turn of conversation.
       * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the activity is a conversation update event related to channels.
       */
      return (context: TurnContext) => {
        return Promise.resolve(
          context?.activity?.type == ActivityTypes.ConversationUpdate &&
            context?.activity?.channelData?.eventType == event &&
            context?.activity?.channelData?.channel &&
            context.activity.channelData?.team
        );
      };
    case "membersAdded":
      /**
       * @param {TurnContext} context The context object for the current turn of conversation.
       * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the activity is a conversation update event with members added.
       */
      return (context: TurnContext) => {
        return Promise.resolve(
          context?.activity?.type == ActivityTypes.ConversationUpdate &&
            Array.isArray(context?.activity?.membersAdded) &&
            context.activity.membersAdded.length > 0
        );
      };
    case "membersRemoved":
      /**
       * @param {TurnContext} context The context object for the current turn of conversation.
       * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the activity is a conversation update event with members removed.
       */
      return (context: TurnContext) => {
        return Promise.resolve(
          context?.activity?.type == ActivityTypes.ConversationUpdate &&
            Array.isArray(context?.activity?.membersRemoved) &&
            context.activity.membersRemoved.length > 0
        );
      };
    case "teamRenamed":
    case "teamDeleted":
    case "teamHardDeleted":
    case "teamArchived":
    case "teamUnarchived":
    case "teamRestored":
      /**
       * @param {TurnContext} context The context object for the current turn of conversation.
       * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the activity is a conversation update event related to teams.
       */
      return (context: TurnContext) => {
        return Promise.resolve(
          context?.activity?.type == ActivityTypes.ConversationUpdate &&
            context?.activity?.channelData?.eventType == event &&
            context?.activity?.channelData?.team
        );
      };
    default:
      /**
       * @param {TurnContext} context The context object for the current turn of conversation.
       * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the activity is a conversation update event with the specified event type.
       */
      return (context: TurnContext) => {
        return Promise.resolve(
          context?.activity?.type == ActivityTypes.ConversationUpdate &&
            context?.activity?.channelData?.eventType == event
        );
      };
  }
}

/**
 * Creates a route selector function that matches a message based on a keyword.
 * @param {string | RegExp | RouteSelector} keyword The keyword to match against the message text. Can be a string, regular expression, or a custom selector function.
 * @returns {RouteSelector} A route selector function that returns true if the message text matches the keyword.
 * @private
 */
function createMessageSelector(
  keyword: string | RegExp | RouteSelector
): RouteSelector {
  if (typeof keyword == "function") {
    // Return the passed in selector function
    return keyword;
  } else if (keyword instanceof RegExp) {
    // Return a function that matches a messages text using a RegExp
    return (context: TurnContext) => {
      if (
        context?.activity?.type === ActivityTypes.Message &&
        context.activity.text
      ) {
        return Promise.resolve(keyword.test(context.activity.text));
      } else {
        return Promise.resolve(false);
      }
    };
  } else {
    // Return a function that attempts to match a messages text using a substring
    const k = keyword.toString().toLocaleLowerCase();
    return (context: TurnContext) => {
      if (
        context?.activity?.type === ActivityTypes.Message &&
        context.activity.text
      ) {
        return Promise.resolve(
          context.activity.text.toLocaleLowerCase().indexOf(k) >= 0
        );
      } else {
        return Promise.resolve(false);
      }
    };
  }
}

/**
 * @private
 * @param {TeamsMessageEvents} event The type of message event to create a selector for.
 * @returns {RouteSelector} A selector function that matches the specified message event.
 */
function createMessageEventUpdateSelector(
  event: TeamsMessageEvents
): RouteSelector {
  switch (event) {
    case "editMessage":
      return (context: TurnContext) => {
        return Promise.resolve(
          context?.activity?.type == ActivityTypes.MessageUpdate &&
            context?.activity?.channelData?.eventType == event
        );
      };
    case "softDeleteMessage":
      return (context: TurnContext) => {
        return Promise.resolve(
          context?.activity?.type == ActivityTypes.MessageDelete &&
            context?.activity?.channelData?.eventType == event
        );
      };
    case "undeleteMessage":
      return (context: TurnContext) => {
        return Promise.resolve(
          context?.activity?.type == ActivityTypes.MessageUpdate &&
            context?.activity?.channelData?.eventType == event
        );
      };
    default:
      throw new Error(`Invalid TeamsMessageEvent type: ${event}`);
  }
}

/**
 * @param {MessageReactionEvents} event The type of message reaction event to create a selector for.
 * @returns {RouteSelector} A selector function that matches the specified message reaction event.
 * @private
 */
function createMessageReactionSelector(
  event: MessageReactionEvents
): RouteSelector {
  switch (event) {
    case "reactionsAdded":
    default:
      /**
       * @param {TurnContext} context The context object for the current turn of the conversation.
       * @returns {Promise<boolean>} A promise that resolves to true if the context object represents a message reaction event with reactions added, or false otherwise.
       */
      return (context: TurnContext) => {
        return Promise.resolve(
          context?.activity?.type == ActivityTypes.MessageReaction &&
            Array.isArray(context?.activity?.reactionsAdded) &&
            context.activity.reactionsAdded.length > 0
        );
      };
    case "reactionsRemoved":
      /**
       * @param {TurnContext} context The context object for the current turn of the conversation.
       * @returns {Promise<boolean>} A promise that resolves to true if the context object represents a message reaction event with reactions removed, or false otherwise.
       */
      return (context: TurnContext) => {
        return Promise.resolve(
          context?.activity?.type == ActivityTypes.MessageReaction &&
            Array.isArray(context?.activity?.reactionsRemoved) &&
            context.activity.reactionsRemoved.length > 0
        );
      };
  }
}

/**
 * Returns a selector function that indicates whether the bot should initiate a sign in.
 * @param {boolean | Selector} startSignIn A boolean or function that indicates whether the bot should initiate a sign in.
 * @returns {Selector} A selector function that returns true if the bot should initiate a sign in.
 */
function createSignInSelector(startSignIn?: boolean | Selector): Selector {
  return (context) => {
    if (typeof startSignIn === "function") {
      return startSignIn(context);
    } else if (typeof startSignIn === "boolean") {
      return Promise.resolve(startSignIn);
    } else {
      return Promise.resolve(true);
    }
  };
}

/**
 * @private
 */
type ApplicationEventHandler<TState extends TurnState> = (
  context: IConversationContext,
  state: TState
) => Promise<boolean>;
