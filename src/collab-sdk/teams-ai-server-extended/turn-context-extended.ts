import { StatusCodes, TurnContext } from "botbuilder";
import {
  IBotInteropRequestData,
  isIBotInteropRequestData,
} from "../shared/request-types";

export interface IEmbedTurnContext extends TurnContext {
  embed: IBotInteropRequestData;
  onEmbedSuccess: (responseData: any) => void;
  onEmbedFailure: (statusCode: StatusCodes, message: string) => void;
}

export function isEmbedTurnContext(
  context: TurnContext
): context is IEmbedTurnContext {
  return isIBotInteropRequestData((context as any).embed);
}
