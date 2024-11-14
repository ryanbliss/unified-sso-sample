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

export type TActivityFeedTopic =
  "app-deep-link"
  | TActivityFeedTopicData;

export async function sendUserActivityFeedNotification(
  token: string,
  userId: string,
  activityType: string,
  previewText: string,
  templateParameters: IActivityFeedTemplateParameter[],
  topic: TActivityFeedTopic,
  appId: string,
): Promise<void> {
  let topicData: TActivityFeedTopicData;
  if (typeof topic === "string") {
    if (topic === "app-deep-link") {
      const app = await getTeamsAppInstallation(token, "personal", userId, appId);
      topicData = {
        source: "entityUrl",
        value: `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/installedApps/${app.id}`,
      };
    }
  } else {
    topicData = topic;
  }
  const endpoint = `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/sendActivityNotification`;
  const graphRequestParams = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "bearer " + token,
    },
    body: JSON.stringify({
      activityType,
      previewText: {
        content: previewText,
      },
      topic,
      templateParameters,
    }),
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
