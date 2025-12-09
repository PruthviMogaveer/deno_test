import { serve } from "./deps.ts";
import { getProjects } from "./routes/projects.ts";
import { authorizeRequest } from "./middleware/auth.ts";
import { loginUser } from "./routes/auth.ts";

// Startup notice
console.log("=".repeat(50));
// Update message to clarify port usage
console.log(
  `🚀 Server starting (port is managed by Deno Deploy or defaults to 8000 locally)`
);
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
  // Authorize user
  const userId = await authorizeRequest(req);
  if (!userId) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  console.log(`🔍 Fetching projects for user ID: ${userId}`);
  const projects = await getProjects(userId);
  return jsonResponse(projects);
});

// Register POST /api/login route
routes.POST.set("/api/login", async (req, _url) => {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse({ error: "Email and password are required" }, 400);
    }

    const token = await loginUser(email, password);
    return jsonResponse({ token });
  } catch (err) {
    console.error("Login error:", err);
    return jsonResponse({ error: err }, 401);
  }
});

// Add GET / route for Deno Deploy warm-up
routes.GET.set("/", async () => {
  return jsonResponse({ status: "ok", message: "Deno server is running" });
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

// Note: "Listening on http://localhost:8000/" is printed by Deno's serve() only when run locally.
// On Deno Deploy, this message does not appear and does not affect deployment.

// Start server with the refactored handler
Deno.serve((req) => handleRequest(req));
