import {
  createReadApiReviewAction,
  getReadApiEventDetail,
  getReadApiHealthPayload,
  getReadApiTimelineResponse
} from "./backend.mjs";

const EVENT_DETAIL_ROUTE = /^\/api\/events\/([^/]+)$/;
const REVIEW_ACTION_ROUTE = /^\/api\/events\/([^/]+)\/review-actions$/;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildMethodNotAllowed(allowedMethods) {
  return {
    statusCode: 405,
    payload: {
      error: "Method not allowed",
      allowedMethods
    },
    allowedMethods
  };
}

function getAllowedMethods(pathname) {
  if (pathname === "/healthz" || pathname === "/api/timeline" || EVENT_DETAIL_ROUTE.test(pathname)) {
    return ["GET", "OPTIONS"];
  }

  if (REVIEW_ACTION_ROUTE.test(pathname)) {
    return ["POST", "OPTIONS"];
  }

  return null;
}

async function readJsonBody(request) {
  const chunks = [];
  let totalSize = 0;

  for await (const chunk of request) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(bufferChunk);
    totalSize += bufferChunk.length;

    if (totalSize > 1_000_000) {
      throw createHttpError(413, "Request body is too large.");
    }
  }

  if (chunks.length === 0) {
    return {};
  }

  const body = Buffer.concat(chunks).toString("utf8").trim();
  if (!body) {
    return {};
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    throw createHttpError(400, "Request body must be valid JSON.");
  }

  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    throw createHttpError(400, "Request body must be a JSON object.");
  }

  return parsedBody;
}

export async function routeReadApiRequest(request, repoRoot) {
  if (!request.url) {
    return {
      statusCode: 404,
      payload: { error: "Not found" }
    };
  }

  const method = request.method ?? "GET";
  const url = new URL(request.url, `http://${request.headers.host ?? "127.0.0.1"}`);
  const allowedMethods = getAllowedMethods(url.pathname);

  if (method === "OPTIONS" && allowedMethods) {
    return {
      statusCode: 204,
      payload: null,
      allowedMethods
    };
  }

  if (url.pathname === "/healthz") {
    if (method !== "GET") {
      return buildMethodNotAllowed(["GET", "OPTIONS"]);
    }

    return {
      statusCode: 200,
      payload: getReadApiHealthPayload()
    };
  }

  if (url.pathname === "/api/timeline") {
    if (method !== "GET") {
      return buildMethodNotAllowed(["GET", "OPTIONS"]);
    }

    return {
      statusCode: 200,
      payload: await getReadApiTimelineResponse(repoRoot)
    };
  }

  const detailMatch = url.pathname.match(EVENT_DETAIL_ROUTE);
  if (detailMatch) {
    if (method !== "GET") {
      return buildMethodNotAllowed(["GET", "OPTIONS"]);
    }

    const eventDetail = await getReadApiEventDetail(repoRoot, detailMatch[1]);
    if (!eventDetail) {
      return {
        statusCode: 404,
        payload: { error: "Event not found" }
      };
    }

    return {
      statusCode: 200,
      payload: eventDetail
    };
  }

  const reviewActionMatch = url.pathname.match(REVIEW_ACTION_ROUTE);
  if (reviewActionMatch) {
    if (method !== "POST") {
      return buildMethodNotAllowed(["POST", "OPTIONS"]);
    }

    const body = await readJsonBody(request);
    const reviewActionResponse = await createReadApiReviewAction(repoRoot, reviewActionMatch[1], body);
    if (!reviewActionResponse) {
      return {
        statusCode: 404,
        payload: { error: "Event not found" }
      };
    }

    return {
      statusCode: 200,
      payload: reviewActionResponse
    };
  }

  return null;
}
