/**
 * Defines values for RoleTypes.
 * Possible values include: 'user', 'bot', 'skill'
 *
 * @readonly
 * @enum {string}
 */
export enum RoleTypes {
  User = "user",
  Bot = "bot",
  Skill = "skill",
}
/**
 * Channel account information needed to route a message
 */
export interface ChannelAccount {
  /**
   * Channel id for the user or bot on this channel (Example: joe@smith.com, or @joesmith or
   * 123456)
   */
  id: string;
  /**
   * Display friendly name
   */
  name: string;
  /**
   * This account's object ID within Azure Active Directory (AAD)
   */
  aadObjectId?: string;
  /**
   * Role of the entity behind the account (Example: User, Bot, etc.). Possible values include:
   * 'user', 'bot', 'skill'
   */
  role?: RoleTypes | string;

  /**
   * Custom properties object (optional)
   */
  properties?: any;
}
/**
 * @interface
 * An interface representing TeamsChannelAccount.
 * Teams channel account detailing user Azure Active Directory details.
 *
 * @extends ChannelAccount
 */
export interface TeamsMember extends ChannelAccount {
  /**
   * @member {string} [givenName] Given name part of the user name.
   */
  givenName?: string;
  /**
   * @member {string} [surname] Surname part of the user name.
   */
  surname?: string;
  /**
   * @member {string} [email] Email Id of the user.
   */
  email?: string;
  /**
   * @member {string} [userPrincipalName] Unique user principal name.
   */
  userPrincipalName?: string;
  /**
   * @member {string} [tenantId] Tenant Id of the user.
   */
  tenantId?: string;
  /**
   * @member {string} [userRole] User Role of the user.
   */
  userRole?: string;
}
export interface TeamsPagedMembersResult {
  /**
   * Paging token
   */
  continuationToken: string;
  /**
   * The Channel Accounts.
   */
  members: TeamsMember[];
}
export function isTeamsPagedMembersResult(
  value: any
): value is TeamsPagedMembersResult {
  return (
    typeof value === "object" &&
    typeof value.continuationToken === "string" &&
    Array.isArray(value.members)
  );
}
