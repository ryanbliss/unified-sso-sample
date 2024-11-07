import { StatusCodes, TurnContext } from "botbuilder";
import {
  IBotInteropRequestData,
  isIBotInteropRequestData,
} from "../shared/request-types";

export interface IEmbedUser {
  aadObjectId: string;
  tenantId: string;
}

export interface IEmbedContext extends IBotInteropRequestData {
  user: IEmbedUser;
  onEmbedSuccess: (responseData: any) => void;
  onEmbedFailure: (statusCode: StatusCodes, message: string) => void;
}

export interface IEmbedTurnContext extends TurnContext {
  embed: IEmbedContext;
}

export function isEmbedTurnContext(
  context: TurnContext
): context is IEmbedTurnContext {
  return isIBotInteropRequestData((context as any).embed);
}
