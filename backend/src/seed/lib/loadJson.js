import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const loadSeedJson = (fileName) => {
  const fullPath = resolve(__dirname, "../data", fileName);
  const raw = readFileSync(fullPath, "utf-8");
  return JSON.parse(raw);
};

