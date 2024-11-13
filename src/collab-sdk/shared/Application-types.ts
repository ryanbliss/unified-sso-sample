import { TConversationType } from ".";

export interface IContinueConversation {
  id: string;
  type: TConversationType;
  teamId?: string;
}

export interface IContinueConversationChat {
  id: string;
  type: "chat";
}
export interface IContinueConversationBotChat {
  id: string;
  type: "personal";
}
export interface IContinueConversationChannel {
  id: string;
  type: "channel";
  teamId: string;
}

export type TContinueConversation =
  | IContinueConversationChat
  | IContinueConversationBotChat
  | IContinueConversationChannel;
