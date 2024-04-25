/**
 * User base interface
 */
export interface IUserBase {
  /**
   * Email to sign in with
   */
  email: string;
  /**
   * Password to sign in with
   */
  password: string;
  /**
   * SSO connections
   */
  connections?: IAuthConnections;
}

export type IUserPasswordless = IUserBase & {
  _id: string;
};

/**
 * Microsoft AAD connection for when user connected account to AAD for SSO
 */
export interface IAADConnection {
  /**
   * AAD object ID for user
   */
  oid: string;
  /**
   * Tenant ID
   */
  tid: string;
  /**
   * User principle name (usually email)
   */
  upn: string;
}

/**
 * User auth connections
 */
export interface IAuthConnections {
  /**
   * AAD connection object for when user linked their account to a Microsoft AAD account
   */
  aad?: IAADConnection;
}
