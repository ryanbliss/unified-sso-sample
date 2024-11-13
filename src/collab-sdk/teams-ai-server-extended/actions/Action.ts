/**
 * FORKED
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TurnState } from "@microsoft/teams-ai";
import { IConversationContext } from "../turn-context-extended";

/**
 * @private
 */
export const StopCommandName = "STOP";

/**
 * The code to execute when the action's name is triggered.
 * @name ActionHandler
 * @function
 * @param {IConversationContext} context The current turn context for the handler callback.
 * @template TState
 * @param {TState} state The current turn state for the handler callback.
 * @template TData
 * @param {TData} data The action payload.
 * @param {string | undefined} action The action name.
 * @returns {Promise<string>}
 */
export type ActionHandler<TState extends TurnState = TurnState, TData = any> = (
  context: IConversationContext,
  state: TState,
  data: TData,
  action?: string
) => Promise<string>;

/**
 * @private
 */
export interface ActionEntry<
  TState extends TurnState = TurnState,
  TData = any
> {
  handler: ActionHandler<TState, TData>;
  allowOverrides: boolean;
}
