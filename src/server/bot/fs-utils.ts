import { mkdirSync, writeFileSync } from "fs";
import { join as joinPath } from "path";
import actions from "./prompts/sequence/actions.json";
import config from "./prompts/sequence/config.json";
import skprompt from "./prompts/sequence/skprompt.txt";

function writeFile(filePath: string, fileName: string, contents: string) {
  const fPath = joinPath(process.cwd(), filePath);
  mkdirSync(fPath, { recursive: true });
  writeFileSync(`${fPath}/${fileName}`, contents);
}

let finished = false;

/**
 * Next.js is a bit of a pain to get working with these static files.
 * It chunks everything it needs as it needs it.
 * teams-ai requires these files be static at a set path, so this should be a fine workaround for now.
 */
export function prepareBotPromptFiles() {
  // In dev this isn't necessary
  if (process.env.NODE_ENV === "development") return;
  // We only want to do this once per server boot
  if (finished) return;
  const basePath = "/src/server/bot/prompts/sequence";
  // Write files to path Teams AI library expects
  try {
    writeFile(basePath, "config.json", JSON.stringify(config, null, 4));
  } catch (err) {
    if (err) {
      console.log("---config.json error", err);
      return;
    }
  }
  try {
    writeFile(basePath, "actions.json", JSON.stringify(actions, null, 4));
  } catch (err) {
    if (err) {
      console.log("---actions.json error", err);
      return;
    }
  }
  try {
    writeFile(basePath, "skprompt.txt", skprompt);
  } catch (err) {
    if (err) {
      console.log("---skprompt.json error", err);
      return;
    }
  }
  finished = true;
}
