import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { handleApi } from "./server/api.mjs";

const ENV_KEYS = [
  "SMS_API_KEY",
  "SMS_SENDER_ID",
  "SMS_DATA_API",
  "SMS_USERS_API",
  "SMS_DATA_DIR",
  "SMS_BACKEND_URL",
];

type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void
) => void;

function apiPlugin(): Plugin {
  const middleware: Middleware = async (req, res, next) => {
    try {
      const handled = await handleApi(req, res);
      if (!handled) next();
    } catch (error) {
      next(error);
    }
  };

  return {
    name: "smsportal:api",
    configureServer(server) {
      server.middlewares.use(middleware as never);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware as never);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  for (const key of ENV_KEYS) {
    if (env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [vue(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
