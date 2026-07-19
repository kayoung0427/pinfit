import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Resolve relative to this file, not process.cwd() — the process may be
// launched from a parent directory (e.g. a monorepo-style launcher).
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

// Imported after dotenv.config() so every module's lazy env reads see the
// loaded values (see the getClient()-style lazy init pattern in vision.ts).
const { app } = await import("./app.js");

const PORT = Number(process.env.PORT) || 3002;

// ── Vite (dev) / static (prod) — only for local `npm run dev` / `npm run build`.
// Vercel deploys don't use this file at all; see api/index.ts instead.
const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  startVite();
} else {
  const distPath = path.join(PROJECT_ROOT, "dist");
  const express = (await import("express")).default;
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  app.listen(PORT, () => {
    console.log(`Production server running on port ${PORT}`);
  });
}

async function startVite() {
  const vite = await createViteServer({
    root: PROJECT_ROOT,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  app.listen(PORT, () => {
    console.log(`Dev server running on http://localhost:${PORT}`);
  });
}
