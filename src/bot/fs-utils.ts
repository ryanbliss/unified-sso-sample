import fs from "fs";
import path from "path";
import actions from "./prompts/sequence/actions.json";
import config from "./prompts/sequence/config.json";
import skprompt from "./prompts/sequence/skprompt.txt";

const getAllFiles = function (dirPath: string, arrayOfFiles: any) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
};

// Next.js is a bit of a pain to get working with these static files.
// It chunks everything it needs as it needs it.
// teams-ai requires these files be static at a set path, so this should be a fine workaround for now.
export function prepareBotPromptFiles() {
  fs.writeFile(
    "/prompts/sequence/config.json",
    JSON.stringify(config, null, 4),
    function (err) {
      if (err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    }
  );
  fs.writeFile(
    "/prompts/sequence/actions.json",
    JSON.stringify(actions, null, 4),
    function (err) {
      if (err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    }
  );
  fs.writeFile("/prompts/sequence/skprompt.json", skprompt, function (err) {
    if (err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });
  const allFiles = getAllFiles(__dirname, undefined);
  console.log(allFiles);
}
