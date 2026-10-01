const { copyFileSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const projectRoot = join(__dirname, "..");
const outputDirectory = join(projectRoot, "dist");
mkdirSync(outputDirectory, { recursive: true });
copyFileSync(
  join(projectRoot, "politica-privacidade.html"),
  join(outputDirectory, "politica-privacidade.html"),
);
