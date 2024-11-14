import { NotificationTopicFactory, OpenPersonalAppTopic } from "../NotificationTopics";
import { getTeamsAppInstallation } from "./app-installations";

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

export type TActivityFeedTopicData = IActivityFeedUrlTopic
| IActivityFeedEntityTopic;

export async function sendUserActivityFeedNotification(
  token: string,
  userId: string,
  activityType: string,
  previewText: string,
  templateParameters: IActivityFeedTemplateParameter[],
  topicFactory: NotificationTopicFactory<any>,
  appId: string,
): Promise<void> {
  if (topicFactory instanceof OpenPersonalAppTopic) {
    topicFactory.setDependencies({ token, userId, appId });
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
  console.log("Sending activity feed notification to user", userId, "with body", body);
  const graphRequestParams = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "bearer " + token,
    },
    body: JSON.stringify(body),
  };

  const response = await fetch(endpoint, graphRequestParams);
  const json = await response.json();
  if (!response.ok) {
    throw new Error(
      json.error?.message || `HTTP error! status: ${response.status}`
    );
  }
  return;
}
