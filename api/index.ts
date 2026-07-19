// Vercel serverless entry point. On Vercel, environment variables are
// injected directly into process.env by the platform — no .env file or
// dotenv.config() call is needed or present here (unlike server/index.ts,
// which is the local-dev entry).
import { app } from "../server/app.js";

export default app;
