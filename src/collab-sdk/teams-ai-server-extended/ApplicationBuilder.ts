import { ApplicationBuilder as BaseApplicationBuilder, TurnState } from "@microsoft/teams-ai";
import { Application } from "./Application";

export class ApplicationBuilder<TState extends TurnState = TurnState> extends BaseApplicationBuilder<TState> {
    /**
     * Builds and returns a new Application instance.
     * @returns {Application<TState>} The Application instance.
     */
    build(): Application<TState> {
        // @ts-expect-error - expecting to use private property
        return new Application(this._options);
    }
}