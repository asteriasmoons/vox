import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const imageExtensions = new Set([
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".ico",
]);

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");
const shouldHelp = args.has("--help") || args.has("-h");
const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const iconsDir = path.join(rootDir, "public", "icons");
const logPath = path.join(iconsDir, "rename-icons-log.json");

if (shouldHelp) {
  console.log(`
Rename icon files to normal lowercase hyphenated names.

Usage:
  npm run icons:rename:check  Preview changes
  npm run icons:rename        Rename files

Rules:
  Vector (32).svg                       -> vector-32.svg
  Vector copy 2.svg                     -> vector-copy-2.svg
  streamline-ultimate--notes-paper.svg  -> notes-paper.svg
  mingcute--github-fill (1).svg         -> github-fill-1.svg
`);
  process.exit(0);
}

function normalizeName(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  const originalBaseName = path.basename(fileName, path.extname(fileName));
  const baseName = originalBaseName.includes("--")
    ? originalBaseName.split("--").at(-1)
    : originalBaseName;

  const normalizedBase = baseName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return `${normalizedBase || "icon"}${extension}`;
}

function normalizeIconProviderName(fileName, previousRenameTargets) {
  const previousTarget = previousRenameTargets.get(fileName);

  if (previousTarget) {
    return normalizeName(previousTarget);
  }

  return normalizeName(fileName);
}

async function readPreviousRenameTargets() {
  try {
    const logContents = await fs.readFile(logPath, "utf8");
    const log = JSON.parse(logContents);

    if (!Array.isArray(log.renames)) {
      return new Map();
    }

    return new Map(
      log.renames
        .filter(
          (rename) =>
            typeof rename.from === "string" &&
            typeof rename.to === "string" &&
            rename.from.includes("--"),
        )
        .map((rename) => [rename.to, rename.from]),
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return new Map();
    }

    throw error;
  }
}

function makeUniqueName(targetName, usedNames) {
  if (!usedNames.has(targetName)) {
    usedNames.add(targetName);
    return targetName;
  }

  const extension = path.extname(targetName);
  const baseName = path.basename(targetName, extension);
  let index = 2;

  while (usedNames.has(`${baseName}-${index}${extension}`)) {
    index += 1;
  }

  const uniqueName = `${baseName}-${index}${extension}`;
  usedNames.add(uniqueName);
  return uniqueName;
}

async function main() {
  const entries = await fs.readdir(iconsDir, { withFileTypes: true });
  const iconFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => imageExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const previousRenameTargets = await readPreviousRenameTargets();
  const existingNames = new Set(iconFiles.map((fileName) => fileName.toLowerCase()));
  const usedNames = new Set();
  const plannedRenames = [];

  for (const fileName of iconFiles) {
    const normalizedName = normalizeIconProviderName(fileName, previousRenameTargets);
    let targetName = makeUniqueName(normalizedName, usedNames);

    if (
      targetName.toLowerCase() !== fileName.toLowerCase() &&
      existingNames.has(targetName.toLowerCase())
    ) {
      targetName = makeUniqueName(
        `${path.basename(normalizedName, path.extname(normalizedName))}-renamed${path.extname(
          normalizedName,
        )}`,
        usedNames,
      );
    }

    if (targetName !== fileName) {
      plannedRenames.push({ from: fileName, to: targetName });
    }
  }

  if (plannedRenames.length === 0) {
    console.log(`No icon files need renaming in ${iconsDir}.`);
    return;
  }

  console.log(
    `${shouldWrite ? "Renaming" : "Previewing"} ${plannedRenames.length} of ${
      iconFiles.length
    } icon files in ${iconsDir}:`,
  );

  for (const rename of plannedRenames.slice(0, 40)) {
    console.log(`  ${rename.from} -> ${rename.to}`);
  }

  if (plannedRenames.length > 40) {
    console.log(`  ...and ${plannedRenames.length - 40} more`);
  }

  if (!shouldWrite) {
    console.log("\nPreview only. Run npm run icons:rename to apply these changes.");
    return;
  }

  const tempRenames = plannedRenames.map((rename, index) => ({
    ...rename,
    temp: `.renaming-icon-${Date.now()}-${index}${path.extname(rename.from)}`,
  }));

  for (const rename of tempRenames) {
    await fs.rename(path.join(iconsDir, rename.from), path.join(iconsDir, rename.temp));
  }

  for (const rename of tempRenames) {
    await fs.rename(path.join(iconsDir, rename.temp), path.join(iconsDir, rename.to));
  }

  await fs.writeFile(
    logPath,
    `${JSON.stringify(
      {
        renamedAt: new Date().toISOString(),
        count: plannedRenames.length,
        renames: plannedRenames,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`\nDone. Wrote rename log to ${logPath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
