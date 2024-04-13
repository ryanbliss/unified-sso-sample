import fs from "fs";
import path from "path";

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

// Usage
const allFiles = getAllFiles(__dirname, undefined);
console.log(allFiles);
