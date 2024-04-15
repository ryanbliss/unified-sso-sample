import { Note } from "@/database/notes";
import { IUserClientState } from "@/models/user-client-state";
import { Attachment, CardFactory } from "botbuilder";

export function notesCard(notes: Note[]): Attachment {
  return CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    type: "AdaptiveCard",
    body: [
      {
        type: "TextBlock",
        size: "Large",
        weight: "Bolder",
        text: "Your notes:",
      },
      ...notes.map((note) => noteBlock(note)),
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "View",
        data: {
          msteams: {
            type: "invoke",
            value: {
              type: "tab/tabInfoAction",
              tabInfo: {
                contentUrl: `https://${process.env.BOT_DOMAIN}`,
                websiteUrl: `https://${process.env.BOT_DOMAIN}`,
                name: "Notes",
                entityId: "UNIFY_NOTES",
              },
            },
          },
        },
      },
    ],
  });
}

export function noteCard(note: Note): Attachment {
  return CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    type: "AdaptiveCard",
    body: [noteBlock(note)],
  });
}

function noteBlock(note: Note) {
  return {
    type: "Container",
    spacing: "Large",
    items: [
      {
        type: "Container",
        items: [
          {
            type: "TextBlock",
            text: note.text,
            wrap: true,
            isSubtle: false,
            color: "Attention",
            weight: "Bolder",
            size: "Default",
          },
          {
            type: "TextBlock",
            text: `Last edited at ${note.editedAt}`,
            wrap: true,
            size: "Small",
            isSubtle: true,
          },
        ],
        separator: true,
        spacing: "Small",
        style: "warning",
      },
    ],
  };
}

/**
 * AI-powered suggestion for improving a note
 * @param suggestionText text AI suggested
 * @param approved whether the user has approved the suggestion or not
 * @returns attachment iwth the card
 */
export function suggestionCard(
  clientState: IUserClientState,
  approved: boolean
): Attachment {
  const body: any[] = [
    {
      type: "Container",
      spacing: "Large",
      items: [
        {
          type: "TextBlock",
          text: "Suggestion:",
          wrap: true,
          isSubtle: false,
          weight: "Bolder",
          size: "Default",
        },
        {
          type: "Container",
          items: [
            {
              type: "TextBlock",
              text: clientState.editingNote?.text,
              wrap: true,
              isSubtle: false,
              color: "Attention",
              weight: "Bolder",
              size: "Default",
            },
          ],
          separator: true,
          spacing: "Small",
          style: "warning",
        },
      ],
    },
  ];
  const actions: any[] = [];
  if (approved) {
    body.push({
      type: "TextBlock",
      text: "Approved",
      isSubtle: true,
    });
  } else {
    actions.push({
      type: "Action.Execute",
      title: "Approve",
      verb: "approve-suggestion",
      data: {
        clientState,
      },
    });
  }
  return CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    type: "AdaptiveCard",
    body,
    actions,
  });
}

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
