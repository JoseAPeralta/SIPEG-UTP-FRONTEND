import { spawn } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { createConnection } from "node:net";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  parseStoryIdList,
  readStoryEntries,
  selectStoryEntriesById,
  shouldBuildStorybook,
} from "./storybook-suite.mjs";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const BUILD_INDEX_PATH = join(PROJECT_ROOT, "storybook-static/index.json");
const SOURCE_DIRECTORIES = ["src", ".storybook"];
const STATIC_PORT = 6007;
const STATIC_URL = `http://127.0.0.1:${STATIC_PORT}`;

function run(command, args, { env } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });

    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function newestTimestamp(target) {
  const stats = await stat(target).catch(() => null);

  if (!stats) {
    return null;
  }

  if (!stats.isDirectory()) {
    return stats.mtimeMs;
  }

  let newest = stats.mtimeMs;

  for (const entry of await readdir(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__image_snapshots__") {
      continue;
    }

    const child = await newestTimestamp(join(target, entry.name));

    if (child !== null && child > newest) {
      newest = child;
    }
  }

  return newest;
}

async function findNewestSourceTimestamp() {
  let newest = null;

  for (const directory of SOURCE_DIRECTORIES) {
    const timestamp = await newestTimestamp(join(PROJECT_ROOT, directory));

    if (timestamp !== null && (newest === null || timestamp > newest)) {
      newest = timestamp;
    }
  }

  return newest;
}

function isListening(port) {
  return new Promise((resolvePromise) => {
    const socket = createConnection({ host: "127.0.0.1", port });

    const finish = (isUp) => {
      socket.destroy();
      resolvePromise(isUp);
    };

    socket.setTimeout(1_000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function parseArguments(argumentsList) {
  const options = { build: "auto", list: false };
  const storyIds = [];

  for (const argument of argumentsList) {
    if (argument === "--") {
      continue;
    } else if (argument === "--no-build") {
      options.build = "never";
    } else if (argument === "--list") {
      options.list = true;
    } else if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      storyIds.push(argument);
    }
  }

  return { options, storyIds: parseStoryIdList(storyIds.join(" ")) };
}

async function main() {
  const { options, storyIds } = parseArguments(process.argv.slice(2));
  const buildStats = await stat(BUILD_INDEX_PATH).catch(() => null);
  const needsBuild = shouldBuildStorybook({
    buildExists: buildStats !== null,
    buildTimestamp: buildStats?.mtimeMs ?? null,
    newestSourceTimestamp: await findNewestSourceTimestamp(),
  });

  if (options.build === "never" && buildStats === null) {
    throw new Error(
      "There is no storybook-static build. Run pnpm run storybook:build or drop --no-build.",
    );
  }

  if (options.build === "auto" && needsBuild) {
    console.log("Building the Storybook catalog because the sources are newer...");
    await run("pnpm", ["run", "storybook:build"]);
  }

  const storybookIndex = JSON.parse(await readFile(BUILD_INDEX_PATH, "utf8"));
  const stories = selectStoryEntriesById(readStoryEntries(storybookIndex), storyIds);

  if (options.list) {
    for (const story of stories) {
      console.log(`${story.id}\t${story.title} / ${story.name}`);
    }

    return;
  }

  if (await isListening(STATIC_PORT)) {
    throw new Error(
      `The port ${STATIC_PORT} is already in use, so the static catalog cannot be served reliably. Stop that process and retry.`,
    );
  }

  console.log(`Starting the static catalog server on ${STATIC_URL}...`);
  const server = spawn("pnpm", ["run", "storybook:serve"], { cwd: PROJECT_ROOT, stdio: "ignore" });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await isListening(STATIC_PORT)) {
      break;
    }

    if (attempt === 99) {
      server.kill("SIGTERM");
      throw new Error(`The static catalog server did not start on ${STATIC_URL}.`);
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }

  try {
    console.log(
      `Running axe and visual checks for ${stories.length} of ${readStoryEntries(storybookIndex).length} stories.`,
    );
    await run(
      "pnpm",
      ["exec", "playwright", "test", "--config", "playwright.storybook.config.ts"],
      {
        env: {
          SIPEG_STORYBOOK_URL: STATIC_URL,
          SIPEG_STORY_IDS: stories.map((story) => story.id).join(","),
        },
      },
    );
  } finally {
    server.kill("SIGTERM");
  }
}

const isDirectExecution =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
