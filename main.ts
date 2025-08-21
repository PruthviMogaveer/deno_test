import { serve } from "./deps.ts";
import { getProjects } from "./routes/projects.ts";

// Startup notice
console.log("=".repeat(50));
console.log(`🚀 Server starting on http://localhost:8000`);
console.log("=".repeat(50));

// Build and reuse CORS + JSON headers
function buildCorsHeaders() {
  return new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
}
const CORS_HEADERS = buildCorsHeaders();

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

// Route handler type and registry
type Handler = (req: Request, url: URL) => Promise<Response>;
const routes: Record<string, Map<string, Handler>> = {
  GET: new Map(),
  POST: new Map(),
  PUT: new Map(),
  DELETE: new Map(),
};

// Register existing GET /api/projects route
routes.GET.set("/api/projects", async (req, url) => {
  const userId = url.searchParams.get("userId") ?? undefined;
  console.log(`🔍 Fetching projects for user ID: ${userId ?? "none"}`);
  const projects = await getProjects(userId);
  return jsonResponse(projects);
});

// Finds a handler for method + pathname, or undefined
function findRouteHandler(method: string, pathname: string) {
  const methodMap = routes[method];
  return methodMap ? methodMap.get(pathname) : undefined;
}

// Main request flow separated for readability
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const startTime = Date.now();

  console.log(`📥 ${req.method} ${url.pathname}${url.search}`);

  // CORS preflight handling
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const handler = findRouteHandler(req.method, url.pathname);
  let response: Response;

  if (!handler) {
    console.log(`❌ Route not found: ${url.pathname}`);
    response = jsonResponse({ error: "Not Found" }, 404);
  } else {
    try {
      response = await handler(req, url);
    } catch (err) {
      console.error("❗ Handler error:", err);
      response = jsonResponse({ error: "Internal Server Error" }, 500);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`📤 Response sent in ${duration}ms (${response.status})`);

  return response;
}

// Start server with the refactored handler
serve((req) => handleRequest(req));
