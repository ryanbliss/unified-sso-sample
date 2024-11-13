import { StatusCodes, TurnContext } from "botbuilder";
import {
  IBotInteropRequestData,
  isIBotInteropRequestData,
} from "../shared/request-types";
import { Conversation } from "./Conversation";

export interface IEmbedUser {
  aadObjectId: string;
  tenantId: string;
}

export interface IEmbedContext extends IBotInteropRequestData {
  user: IEmbedUser;
  onEmbedSuccess: (responseData: any) => void;
  onEmbedFailure: (statusCode: StatusCodes, message: string) => void;
}

export interface IConversationContext extends TurnContext {
  conversation: Conversation;
}

export interface IEmbedTurnContext extends IConversationContext {
  embed: IEmbedContext;
}

export function isEmbedTurnContext(
  context: TurnContext
): context is IEmbedTurnContext {
  return isIBotInteropRequestData((context as any).embed);
}
