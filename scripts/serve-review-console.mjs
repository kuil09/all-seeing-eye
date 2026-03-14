import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getReadApiHealthPayload
} from "../services/read-api/backend.mjs";
import {
  routeReadApiRequest
} from "../services/read-api/http-handler.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const host = process.env.HOST ?? "127.0.0.1";
const portArgIndex = process.argv.findIndex((arg) => arg === "--port");
const port =
  process.env.PORT ??
  (portArgIndex >= 0 ? process.argv[portArgIndex + 1] : undefined) ??
  4173;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".sql": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function respondNotFound(response) {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
}

function respondJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    respondNotFound(response);
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? host}`);

  if (url.pathname === "/") {
    response.writeHead(302, { Location: "/apps/review-console/" });
    response.end();
    return;
  }

  if (url.pathname === "/healthz") {
    respondJson(response, 200, getReadApiHealthPayload());
    return;
  }

  try {
    const routedResponse = await routeReadApiRequest(request, repoRoot);
    if (routedResponse) {
      if (routedResponse.statusCode === 204) {
        response.writeHead(204);
        response.end();
        return;
      }

      respondJson(response, routedResponse.statusCode, routedResponse.payload);
      return;
    }
  } catch (error) {
    respondJson(response, error.statusCode ?? 500, {
      error: error instanceof Error ? error.message : "Unexpected read API failure"
    });
    return;
  }

  const requestedPath = decodeURIComponent(url.pathname);
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(repoRoot, normalizedPath);

  if (!filePath.startsWith(repoRoot)) {
    respondNotFound(response);
    return;
  }

  try {
    let fileStats = await stat(filePath);

    if (fileStats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      fileStats = await stat(filePath);
    }

    if (!fileStats.isFile()) {
      respondNotFound(response);
      return;
    }

    await access(filePath);

    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    respondNotFound(response);
  }
});

server.listen(port, host, () => {
  console.log(`Review console available at http://${host}:${port}/apps/review-console/`);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
