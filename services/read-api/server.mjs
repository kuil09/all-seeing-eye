import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { routeReadApiRequest } from "./http-handler.mjs";

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(payload === null ? "" : `${JSON.stringify(payload, null, 2)}\n`);
}

const server = createServer(async (request, response) => {
  try {
    const routedResponse = await routeReadApiRequest(request, repoRoot);
    if (!routedResponse) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    if (routedResponse.statusCode === 204) {
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Origin": "*"
      });
      response.end();
      return;
    }

    sendJson(response, routedResponse.statusCode, routedResponse.payload);
  } catch (error) {
    sendJson(response, error.statusCode ?? 500, {
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
