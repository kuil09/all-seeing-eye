import { mkdtemp, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { pollCuratedPipeline } from "./poll_loader.mjs";
import { seedDemoPipeline } from "./seed_loader.mjs";
import { openPipelineStore } from "./sqlite_store.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("seedDemoPipeline persists successful ingest run history", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "all-seeing-eye-seed-"));
  const dbPath = path.join(tempDir, "pipeline.sqlite");

  const result = await seedDemoPipeline({
    repoRoot,
    dbPath,
    ingestRunId: "seed_history_test"
  });

  assert.equal(result.fetched.feeds, 4);

  const store = openPipelineStore({
    repoRoot,
    dbPath
  });

  try {
    store.initializeSchema();
    const history = store.getIngestRunHistory(5);

    assert.equal(history.lastSuccessfulRun?.ingestRunId, "seed_history_test");
    assert.equal(history.lastSuccessfulRun?.mode, "fixture_seed");
    assert.equal(history.lastSuccessfulRun?.persistedSourceRecordCount, 4);
    assert.equal(history.recentRuns[0].feeds.length, 4);
  } finally {
    store.close();
  }
});

test("pollCuratedPipeline records partial failures with per-feed context", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "all-seeing-eye-poll-"));
  const dbPath = path.join(tempDir, "pipeline.sqlite");
  const requestCounts = new Map();

  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const count = (requestCounts.get(url.pathname) ?? 0) + 1;
    requestCounts.set(url.pathname, count);

    if (url.pathname === "/ok.xml") {
      response.writeHead(200, { "Content-Type": "application/rss+xml; charset=utf-8" });
      response.end(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Operations</title>
    <item>
      <guid>ok-1</guid>
      <title>North terminal clears inspection backlog</title>
      <link>https://example.org/items/ok-1</link>
      <description>Harbor operations returned to normal throughput.</description>
      <pubDate>Tue, 17 Mar 2026 01:15:00 GMT</pubDate>
    </item>
  </channel>
</rss>`);
      return;
    }

    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("temporary upstream failure");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  assert.ok(port);

  const allowlistPath = path.join(tempDir, "allowlist.json");
  await writeFile(
    allowlistPath,
    JSON.stringify(
      {
        feeds: [
          {
            feedKey: "ok-feed",
            url: `http://127.0.0.1:${port}/ok.xml`,
            category: "logistics"
          },
          {
            feedKey: "failing-feed",
            url: `http://127.0.0.1:${port}/fail.xml`,
            category: "infrastructure"
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  try {
    const result = await pollCuratedPipeline({
      repoRoot,
      dbPath,
      allowlistPath,
      ingestRunId: "live_poll_history_test",
      maxAttempts: 2,
      maxItemsPerFeed: 5,
      timeoutMs: 2_000
    });

    assert.equal(result.status, "partial_failure");
    assert.equal(result.fetched.failedFeeds, 1);
    assert.deepEqual(result.persisted, {
      sourceRecords: 1,
      events: 1,
      claims: 1,
      confidenceAssessments: 3
    });
    assert.equal(result.counts.sourceRecords, 1);
    assert.equal(result.counts.events, 1);
    assert.equal(result.counts.claims, 1);
    assert.equal(result.counts.eventSourceRecords, 1);
    assert.equal(result.counts.confidenceAssessments, 3);
    assert.ok(result.qualityChecks.every((check) => check.ok));
    assert.equal(requestCounts.get("/fail.xml"), 2);

    const store = openPipelineStore({
      repoRoot,
      dbPath
    });

    try {
      store.initializeSchema();
      const history = store.getIngestRunHistory(5);

      assert.equal(history.lastFailedRun?.ingestRunId, "live_poll_history_test");
      assert.equal(history.lastFailedRun?.persistedSourceRecordCount, 1);
      assert.equal(history.recentRuns[0].feeds.length, 2);
      assert.equal(
        history.recentRuns[0].feeds.find((feed) => feed.feedKey === "failing-feed")?.status,
        "failed"
      );
      assert.match(
        history.recentRuns[0].feeds.find((feed) => feed.feedKey === "failing-feed")?.errorMessage ?? "",
        /HTTP 503/
      );
    } finally {
      store.close();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("pollCuratedPipeline persists live-polled items without replacing the seed baseline", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "all-seeing-eye-live-"));
  const dbPath = path.join(tempDir, "pipeline.sqlite");

  await seedDemoPipeline({
    repoRoot,
    dbPath,
    ingestRunId: "seed_before_live_poll"
  });

  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");

    if (url.pathname === "/live.xml") {
      response.writeHead(200, { "Content-Type": "application/rss+xml; charset=utf-8" });
      response.end(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Port Operations</title>
    <item>
      <guid>live-1</guid>
      <title>Harbor authority extends inspection hours</title>
      <link>https://example.org/items/live-1</link>
      <description>North terminal inspection activity will remain elevated through the evening shift.</description>
      <pubDate>Tue, 17 Mar 2026 02:45:00 GMT</pubDate>
    </item>
  </channel>
</rss>`);
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("not found");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  assert.ok(port);

  const allowlistPath = path.join(tempDir, "allowlist.json");
  await writeFile(
    allowlistPath,
    JSON.stringify(
      {
        feeds: [
          {
            feedKey: "regional-port-bulletin",
            url: `http://127.0.0.1:${port}/live.xml`,
            category: "logistics"
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  try {
    const result = await pollCuratedPipeline({
      repoRoot,
      dbPath,
      allowlistPath,
      ingestRunId: "live_poll_synthesis_test",
      maxAttempts: 1,
      maxItemsPerFeed: 5,
      timeoutMs: 2_000
    });

    assert.equal(result.status, "succeeded");
    assert.deepEqual(result.persisted, {
      sourceRecords: 1,
      events: 1,
      claims: 1,
      confidenceAssessments: 3
    });
    assert.equal(result.counts.sourceRecords, 5);
    assert.equal(result.counts.events, 3);
    assert.equal(result.counts.claims, 5);
    assert.equal(result.counts.eventSourceRecords, 5);
    assert.equal(result.counts.confidenceAssessments, 16);
    assert.ok(result.qualityChecks.every((check) => check.ok));
    assert.ok(
      result.events.some((event) => event.id === "evt_20260314_harbor_north_inspections")
    );
    assert.ok(
      result.events.some((event) => event.title === "Harbor authority extends inspection hours")
    );

    const store = openPipelineStore({
      repoRoot,
      dbPath
    });

    try {
      store.initializeSchema();
      const history = store.getIngestRunHistory(5);

      assert.equal(history.lastSuccessfulRun?.ingestRunId, "live_poll_synthesis_test");
      assert.equal(history.lastSuccessfulRun?.mode, "live_poll");
      assert.equal(history.lastSuccessfulRun?.persistedSourceRecordCount, 1);
      assert.equal(history.recentRuns[0].feeds.length, 1);
    } finally {
      store.close();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
