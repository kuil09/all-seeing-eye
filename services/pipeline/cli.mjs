import path from "node:path";
import { fileURLToPath } from "node:url";

import { pollCuratedPipeline } from "./poll_loader.mjs";
import { seedDemoPipeline } from "./seed_loader.mjs";
import { openPipelineStore, resolveDatabasePath } from "./sqlite_store.mjs";

const command = process.argv[2];
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");

try {
  switch (command) {
    case "seed-demo":
      await runSeedDemo();
      break;
    case "stats":
      runStats();
      break;
    case "poll-curated":
      await runPollCurated();
      break;
    case "ingest-runs":
      runIngestRuns();
      break;
    case "help":
    case undefined:
      printUsage();
      break;
    default:
      throw new Error(`Unknown pipeline command "${command}".`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function runSeedDemo() {
  const dbPath = getFlagValue("--db");
  const datasetPath = getFlagValue("--dataset");
  const ingestRunId = getFlagValue("--run-id") ?? `manual_${Date.now()}`;
  const result = await seedDemoPipeline({
    repoRoot,
    dbPath,
    datasetPath,
    ingestRunId,
    logger: createCliLogger()
  });

  console.log(JSON.stringify(result, null, 2));
}

function runStats() {
  const dbPath = resolveDatabasePath(repoRoot, getFlagValue("--db"));
  const store = openPipelineStore({
    repoRoot,
    dbPath
  });

  try {
    store.initializeSchema();

    const payload = {
      dbPath,
      counts: store.getTableCounts(),
      qualityChecks: store.runDataQualityChecks(),
      events: store.listEvents(),
      ingestRuns: store.getIngestRunHistory(getNumericFlagValue("--limit") ?? 5)
    };

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    store.close();
  }
}

async function runPollCurated() {
  const dbPath = getFlagValue("--db");
  const allowlistPath = getFlagValue("--allowlist");
  const ingestRunId = getFlagValue("--run-id") ?? `poll_${Date.now()}`;
  const maxAttempts = getNumericFlagValue("--max-attempts") ?? 3;
  const maxItemsPerFeed = getNumericFlagValue("--max-items") ?? 20;
  const timeoutMs = getNumericFlagValue("--timeout-ms") ?? 10_000;
  const result = await pollCuratedPipeline({
    repoRoot,
    dbPath,
    allowlistPath,
    ingestRunId,
    maxAttempts,
    maxItemsPerFeed,
    timeoutMs,
    logger: createCliLogger()
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.status !== "succeeded") {
    console.error(`[pipeline] curated poll completed with status ${result.status}.`);
    process.exitCode = 1;
  }
}

function runIngestRuns() {
  const dbPath = resolveDatabasePath(repoRoot, getFlagValue("--db"));
  const limit = getNumericFlagValue("--limit") ?? 10;
  const store = openPipelineStore({
    repoRoot,
    dbPath
  });

  try {
    store.initializeSchema();

    console.log(
      JSON.stringify(
        {
          dbPath,
          ingestRuns: store.getIngestRunHistory(limit)
        },
        null,
        2
      )
    );
  } finally {
    store.close();
  }
}

function getFlagValue(flag) {
  const flagIndex = process.argv.findIndex((arg) => arg === flag);

  if (flagIndex === -1) {
    return null;
  }

  const value = process.argv[flagIndex + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${flag}.`);
  }

  return value;
}

function getNumericFlagValue(flag) {
  const value = getFlagValue(flag);

  if (value === null) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Expected ${flag} to be an integer.`);
  }

  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node services/pipeline/cli.mjs seed-demo [--db <path>] [--dataset <path>] [--run-id <id>]
  node services/pipeline/cli.mjs stats [--db <path>] [--limit <count>]
  node services/pipeline/cli.mjs poll-curated --allowlist <path> [--db <path>] [--run-id <id>] [--max-attempts <n>] [--max-items <n>] [--timeout-ms <ms>]
  node services/pipeline/cli.mjs ingest-runs [--db <path>] [--limit <count>]`);
}

function createCliLogger() {
  return {
    info(message) {
      console.error(message);
    },
    warn(message) {
      console.error(message);
    }
  };
}
