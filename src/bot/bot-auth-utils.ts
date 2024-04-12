import { findAADUser } from "@/database/user";
import { signAppToken } from "@/utils/app-auth-utils";
import { TurnContext } from "botbuilder";

/**
 * Utility function that converts bot context into an app user token.
 * This will be used to access endpoints on this app that only support custom app tokens (e.g., /api/notes/list/my)
 *
 * @param context bot context
 * @returns app-specific token
 */
export async function getAppAuthToken(context: TurnContext): Promise<string> {
  if (!context.activity.from.aadObjectId) {
    throw new Error("This user does not have a valid aadObjectId");
  }
  if (!context.activity.conversation.tenantId) {
    throw new Error(
      "This conversation does not have a valid tenantId"
    );
  }
  const user = await findAADUser(
    context.activity.from.aadObjectId!,
    // TODO: use tid from parsed MSAL token to support federated scenarios
    context.activity.conversation.tenantId!
  );
  if (!user) {
    throw new Error("No account linked to this AAD user");
  }
  // Depending on your auth provider, you may end up needing to implement some sort of oauth connection to your app
  // But if you can mint tokens within your service that may be easier
  const token = signAppToken(user, "aad");
  return token;
}
