import { Attachment, CardFactory } from "botbuilder";

/**
 * @returns {any} initial adaptive card.
 */
export function createSignInCard(): Attachment {
  return CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    type: "AdaptiveCard",
    body: [
      {
        type: "TextBlock",
        text: "",
        size: "Medium",
        weight: "Bolder",
      },
      {
        type: "ActionSet",
        fallback: "drop",
        actions: [
          {
            type: "Action.Execute",
            title: "Sign in",
            verb: "signin",
          },
        ],
      },
    ],
  });
}

/**
 *
 * @param {string} displayName The display name of the user
 * @param {string} profilePhoto The profile photo of the user
 * @returns {Attachment} The adaptive card attachment for the user profile.
 */
export function createUserProfileCard(
  displayName: string,
  profilePhoto: string
): Attachment {
  console.log(
    "cards.ts createUserProfileCard: building card for displayName",
    displayName,
    "and profilePhoto",
    profilePhoto
  );

  return CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    type: "AdaptiveCard",
    refresh: {
      action: {
        fallback: "drop",
        type: "Action.Execute",
        title: "Sign in",
        verb: "signin",
      },
    },
    body: [
      {
        type: "TextBlock",
        text: "Hello: " + displayName,
      },
      {
        type: "Image",
        url: profilePhoto,
      },
      {
        type: "ActionSet",
        fallback: "drop",
        actions: [
          {
            type: "Action.Execute",
            title: "Sign out",
            verb: "signout",
          },
        ],
      },
    ],
  });
}

/**
 * @returns {any} initial adaptive card.
 */
export function testCard(text: string): Attachment {
  return CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    type: "AdaptiveCard",
    body: [
      {
        type: "TextBlock",
        text: text,
        size: "Medium",
        weight: "Bolder",
      },
      {
        type: "ActionSet",
        fallback: "drop",
        actions: [
          {
            type: "Action.Execute",
            title: "Test",
            verb: "test",
          },
        ],
      },
    ],
  });
}
