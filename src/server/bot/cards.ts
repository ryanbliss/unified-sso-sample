import { Note } from "@/server/database/notes";
import { IUserClientState } from "@/shared/models/user-client-state";
import { TaskModuleInvokeNames } from "@microsoft/teams-ai";
import { Attachment, CardFactory } from "botbuilder";

export function createAppSignInCard(userName: string): Attachment {
  const { DEFAULT_TASK_DATA_FILTER } = TaskModuleInvokeNames;
  return CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    type: "AdaptiveCard",
    body: [
      {
        type: "TextBlock",
        text: `Hi ${userName}! Let's finish your account setup.`,
        size: "Medium",
        weight: "Bolder",
      },
      {
        type: "TextBlock",
        text: `Your Microsoft account is not yet linked to a Unify account. You will only need to do this once.`,
        size: "Default",
        isSubtle: true,
        wrap: true,
      },
    ],
    msteams: {
      width: "Full",
    },
    actions: [
      {
        id: "connect-account",
        type: "Action.Submit",
        title: "Connect account",
        verb: "connect-account",
        data: {
          // Teams AI library requires the verb be attached to the data field
          [DEFAULT_TASK_DATA_FILTER]: "connect-account",
          msteams: {
            type: "task/fetch",
          },
        },
      },
    ],
  });
}

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
    msteams: {
      width: "Full",
    },
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
                contentUrl: `https://${process.env.NEXT_PUBLIC_BOT_DOMAIN}`,
                websiteUrl: `https://${process.env.NEXT_PUBLIC_BOT_DOMAIN}`,
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
    msteams: {
      width: "Full",
    },
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
        bleed: true,
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
              size: "Default",
            },
          ],
          spacing: "Small",
          style: "warning",
          bleed: true,
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
    msteams: {
      width: "Full",
    },
    actions,
  });
}

/**
 * @returns {any} initial adaptive card.
 */
export function createGraphSignInCard(): Attachment {
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
    msteams: {
      width: "Full",
    },
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
    msteams: {
      width: "Full",
    },
  });
}
