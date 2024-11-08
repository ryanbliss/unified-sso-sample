import { Configuration } from "@azure/msal-browser";

export interface IEntraConfiguration extends Configuration {
    /**
     * Default value is TODO
     */
    scopes?: string[];
}
