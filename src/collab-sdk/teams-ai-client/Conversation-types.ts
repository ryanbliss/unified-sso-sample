
export interface IGetMembersOptions {
    /**
     * Where to make the request.
     * @remarks
     * If you have a bot, the default is "server".
     * If you have no bot but have Entra authentication configured, default is "client".
     * To use "server", you must have "ChatMember.Read.Chat" and "TeamMember.Read.Group" RSC permissions included in your app manifest prior to installation.
     */
    requestType?: "server" | "client";
}
