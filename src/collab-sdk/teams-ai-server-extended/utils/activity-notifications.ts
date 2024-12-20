import { TGroupConversationType } from "@/collab-sdk/shared";
import {
  NotificationTopicFactory,
  OpenPersonalAppTopicFactory,
} from "../NotificationTopics";

export interface IActivityFeedTemplateParameter {
  name: string;
  value: string;
}

export interface IActivityFeedUrlTopic {
  source: "text";
  value: string;
  webUrl: string;
}

export interface IActivityFeedEntityTopic {
  source: "entityUrl";
  value: string;
}

export type TActivityFeedTopicData =
  | IActivityFeedUrlTopic
  | IActivityFeedEntityTopic;

export async function sendUserActivityFeedNotification(
  token: string,
  userId: string,
  activityType: string,
  previewText: string,
  templateParameters: IActivityFeedTemplateParameter[],
  topicFactory: NotificationTopicFactory<any>,
  appId: string
): Promise<void> {
  if (topicFactory instanceof OpenPersonalAppTopicFactory) {
    topicFactory.setDependencies({
      token,
      resourceId: userId,
      resourceType: "personal",
      appId,
    });
  }
  let topicData: TActivityFeedTopicData = await topicFactory.toTopic();
  const endpoint = `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/sendActivityNotification`;
  const body = {
    activityType,
    previewText: {
      content: previewText,
    },
    topic: topicData,
    templateParameters,
  };
  console.log(
    "Sending activity feed notification to user",
    userId,
    "with body",
    body
  );
  const graphRequestParams = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "bearer " + token,
    },
    body: JSON.stringify(body),
  };

  const response = await fetch(endpoint, graphRequestParams);
  if (!response.ok) {
    const json = await response.json();
    throw new Error(
      json.error?.message || `HTTP error! status: ${response.status}`
    );
  }
  return;
}

export async function sendConversationActivityFeedNotification(
  token: string,
  resourceType: TGroupConversationType,
  resourceId: string,
  activityType: string,
  previewText: string,
  templateParameters: IActivityFeedTemplateParameter[],
  topicFactory: NotificationTopicFactory<any>,
  appId: string
): Promise<void> {
  if (topicFactory instanceof OpenPersonalAppTopicFactory) {
    topicFactory.setDependencies({
      token,
      resourceId,
      resourceType,
      appId,
    });
  }
  let topicData: TActivityFeedTopicData = await topicFactory.toTopic();
  const prefix = resourceType === "chat" ? "chats" : "teams";
  const endpoint = `https://graph.microsoft.com/v1.0/${prefix}/${resourceId}/sendActivityNotification`;
  const recipient =
    resourceType === "chat"
      ? {
          "@odata.type": "microsoft.graph.chatMembersNotificationRecipient",
          chatId: resourceId,
        }
      : {
          "@odata.type": "microsoft.graph.teamMembersNotificationRecipient",
          teamId: resourceId,
        };
  const body = {
    activityType,
    previewText: {
      content: previewText,
    },
    topic: topicData,
    templateParameters,
    recipient,
  };
  console.log(
    "Sending activity feed notification to",
    resourceType,
    "with id",
    resourceId,
    "with body",
    body
  );
  const graphRequestParams = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "bearer " + token,
    },
    body: JSON.stringify(body),
  };

  const response = await fetch(endpoint, graphRequestParams);
  if (!response.ok) {
    const json = await response.json();
    throw new Error(
      json.error?.message || `HTTP error! status: ${response.status}`
    );
  }
  return;
}
