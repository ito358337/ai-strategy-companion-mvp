import fs from "node:fs/promises";
import path from "node:path";
import "./validate-question-bank.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");

await fs.rm(dist, { force: true, recursive: true });
await fs.mkdir(dist, { recursive: true });

for (const entry of ["index.html", "test", "src", "README.md", "databaseSchema.md"]) {
  await fs.cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
}

console.log("Static site built to dist/.");
