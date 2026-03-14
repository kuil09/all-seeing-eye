import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getEventDetail, getTimelineResponse } from "./fixture-store.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const host = process.env.HOST ?? "127.0.0.1";
const portArgIndex = process.argv.findIndex((arg) => arg === "--port");
const port =
  process.env.PORT ??
  (portArgIndex >= 0 ? process.argv[portArgIndex + 1] : undefined) ??
  4310;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? host}`);

  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Origin": "*"
      });
      response.end();
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, {
        error: "Method not allowed",
        allowedMethods: ["GET", "OPTIONS"]
      });
      return;
    }

    if (url.pathname === "/healthz") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (url.pathname === "/api/timeline") {
      sendJson(response, 200, await getTimelineResponse(repoRoot));
      return;
    }

    const detailMatch = url.pathname.match(/^\/api\/events\/([^/]+)$/);
    if (detailMatch) {
      const eventDetail = await getEventDetail(repoRoot, detailMatch[1]);

      if (!eventDetail) {
        sendJson(response, 404, { error: "Event not found" });
        return;
      }

      sendJson(response, 200, eventDetail);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unexpected read API failure"
    });
  }
});

server.listen(port, host, () => {
  console.log(`read-api listening on http://${host}:${port}`);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
