import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./api.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(projectRoot, "dist");
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || "0.0.0.0";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

function resolveStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = path
    .normalize(decoded)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  const candidate = path.join(distDir, relative);

  if (!candidate.startsWith(distDir)) return null;
  if (!existsSync(candidate)) return null;
  if (statSync(candidate).isFile()) return candidate;

  return null;
}

function serveFile(filePath, response) {
  const ext = path.extname(filePath).toLowerCase();
  response.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
  response.setHeader("Cache-Control", ext === ".html" ? "no-cache" : "public, max-age=3600");
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const isApi = await handleApi(request, response);
    if (isApi) return;

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.statusCode = 405;
      response.end("Method Not Allowed");
      return;
    }

    const filePath = resolveStaticPath(request.url ?? "/");

    if (filePath) {
      serveFile(filePath, response);
      return;
    }

    const indexPath = path.join(distDir, "index.html");
    if (existsSync(indexPath)) {
      serveFile(indexPath, response);
      return;
    }

    response.statusCode = 404;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end(
      "Build output not found. Run `npm run build` before starting the server."
    );
  } catch (error) {
    console.error("Server error:", error);
    response.statusCode = 500;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(port, host, () => {
  console.log(`SMS Portal server running at http://localhost:${port}`);
});
