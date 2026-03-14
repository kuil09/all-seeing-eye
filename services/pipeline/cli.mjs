import path from "node:path";
import { fileURLToPath } from "node:url";

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
    const payload = {
      dbPath,
      counts: store.getTableCounts(),
      qualityChecks: store.runDataQualityChecks(),
      events: store.listEvents()
    };

    console.log(JSON.stringify(payload, null, 2));
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

function printUsage() {
  console.log(`Usage:
  node services/pipeline/cli.mjs seed-demo [--db <path>] [--dataset <path>] [--run-id <id>]
  node services/pipeline/cli.mjs stats [--db <path>]`);
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
