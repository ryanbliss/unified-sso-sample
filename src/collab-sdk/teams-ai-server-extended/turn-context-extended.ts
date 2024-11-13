import { StatusCodes, TurnContext } from "botbuilder";
import {
  IBotInteropRequestData,
  isIBotInteropRequestData,
} from "../shared/request-types";
import { Conversation } from "./Conversation";
import { User } from "./User";

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
  user: User;
}

export interface IEmbedTurnContext extends IConversationContext {
  embed: IEmbedContext;
}

export function isEmbedTurnContext(
  context: TurnContext
): context is IEmbedTurnContext {
  return isIBotInteropRequestData((context as any).embed);
}
