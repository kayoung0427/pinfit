import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";

import {
  isPinterestConfigured,
  getAuthorizationUrl,
  exchangeCodeForToken,
  getMyBoards,
  getBoardPins,
  getMyRecentSavedPins,
  getMyUsername,
} from "./pinterestClient.js";
import { setAuthCookies, clearAuthCookies, getValidAccessToken } from "./session.js";
import { getProfilePins, PinterestProfileError } from "./pinterestRss.js";
import { isVisionConfigured, analyzeOutfitImage, rerankByVisualSimilarity } from "./vision.js";
import { searchAllMalls, MALL_IDS } from "./malls/index.js";
import type { MallId, MallProduct } from "./malls/types.js";
import { isLensConfigured, findVisualMatches } from "./lens.js";
import { isNaverConfigured } from "./malls/naver.js";

// Pure Express app + all API routes — no dotenv loading, no app.listen(), no
// Vite middleware. Local dev (server/index.ts) and the Vercel serverless
// entry (api/index.ts) both import this and each add what they need on top.

export const app = express();
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";

app.use(express.json({ limit: "15mb" }));
app.use(cookieParser(SESSION_SECRET));

// ── Config status (frontend uses this to explain what's missing) ──────────
app.get("/api/config-status", (_req, res) => {
  res.json({
    pinterestConfigured: isPinterestConfigured(),
    visionConfigured: isVisionConfigured(),
    naverConfigured: isNaverConfigured(),
    lensConfigured: isLensConfigured(),
    malls: MALL_IDS,
  });
});

// ── Pinterest via public RSS (primary path — no API key/approval needed) ──
app.get("/api/pinterest/feed", async (req, res) => {
  const username = String(req.query.username || "");
  try {
    const pins = await getProfilePins(username);
    res.json({ username: username.trim().replace(/^@/, ""), pins });
  } catch (err) {
    if (err instanceof PinterestProfileError) {
      const status = err.code === "not_found" ? 404 : err.code === "fetch_failed" ? 502 : 400;
      return res.status(status).json({ error: err.message });
    }
    console.error("[pinterest-rss] unexpected error:", err);
    res.status(500).json({ error: "핀을 불러오는 중 오류가 발생했습니다." });
  }
});

// ── Pinterest OAuth (optional legacy path — requires approved developer app) ──
app.get("/api/auth/pinterest/login", (req, res) => {
  if (!isPinterestConfigured()) {
    return res.status(500).send("Pinterest 앱 정보가 서버에 설정되어 있지 않습니다. .env를 확인하세요.");
  }
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("pt_oauth_state", state, {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 10,
  });
  res.redirect(getAuthorizationUrl(state));
});

app.get("/api/auth/pinterest/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;
  const expectedState = req.signedCookies?.pt_oauth_state;
  res.clearCookie("pt_oauth_state");

  if (error) {
    return res.redirect(`/?pinterest_error=${encodeURIComponent(error)}`);
  }
  if (!code || !state || state !== expectedState) {
    return res.redirect("/?pinterest_error=invalid_state");
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    setAuthCookies(res, tokens);
    res.redirect("/?connected=1");
  } catch (err) {
    console.error("[pinterest] token exchange failed:", err);
    res.redirect("/?pinterest_error=token_exchange_failed");
  }
});

app.post("/api/auth/pinterest/logout", (_req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

app.get("/api/auth/pinterest/status", async (req, res) => {
  const token = await getValidAccessToken(req, res);
  if (!token) return res.json({ connected: false });
  try {
    const username = await getMyUsername(token);
    res.json({ connected: true, username });
  } catch (err) {
    console.error("[pinterest] status check failed:", err);
    res.json({ connected: false });
  }
});

// ── Pinterest data ──────────────────────────────────────────────────────
app.get("/api/pinterest/boards", async (req, res) => {
  const token = await getValidAccessToken(req, res);
  if (!token) return res.status(401).json({ error: "Pinterest에 연동되어 있지 않습니다." });
  try {
    const boards = await getMyBoards(token);
    res.json({ boards });
  } catch (err: any) {
    console.error("[pinterest] boards fetch failed:", err);
    res.status(502).json({ error: "Pinterest 보드를 불러오지 못했습니다." });
  }
});

app.get("/api/pinterest/boards/:boardId/pins", async (req, res) => {
  const token = await getValidAccessToken(req, res);
  if (!token) return res.status(401).json({ error: "Pinterest에 연동되어 있지 않습니다." });
  try {
    const pins = await getBoardPins(token, req.params.boardId, 30);
    res.json({ pins });
  } catch (err: any) {
    console.error("[pinterest] pins fetch failed:", err);
    res.status(502).json({ error: "핀을 불러오지 못했습니다." });
  }
});

app.get("/api/pinterest/recent-pins", async (req, res) => {
  const token = await getValidAccessToken(req, res);
  if (!token) return res.status(401).json({ error: "Pinterest에 연동되어 있지 않습니다." });
  try {
    const pins = await getMyRecentSavedPins(token, 30);
    res.json({ pins });
  } catch (err: any) {
    console.error("[pinterest] recent pins fetch failed:", err);
    res.status(502).json({ error: "핀을 불러오지 못했습니다." });
  }
});

// ── Outfit analysis (Pinterest pin OR direct upload → detected items → mall matches) ──
function sanitizeMallIds(input: unknown): MallId[] {
  if (!Array.isArray(input)) return MALL_IDS;
  const valid = input.filter((m): m is MallId => MALL_IDS.includes(m));
  return valid.length > 0 ? valid : MALL_IDS;
}

app.post("/api/analyze", async (req, res) => {
  const { imageUrl, sourceType, sourceTitle, malls } = req.body as {
    imageUrl?: string;
    sourceType?: "pinterest" | "upload";
    sourceTitle?: string;
    malls?: string[];
  };

  if (!imageUrl) {
    return res.status(400).json({ error: "imageUrl이 필요합니다." });
  }
  if (!isVisionConfigured()) {
    return res.status(500).json({ error: "OPENAI_API_KEY가 설정되어 있지 않습니다." });
  }

  const mallIds = sanitizeMallIds(malls);

  try {
    // Run the outfit breakdown (keyword search) and the Google Lens visual
    // search in parallel — they're independent and Lens can be slow.
    const [vision, visualMatches] = await Promise.all([
      analyzeOutfitImage(imageUrl),
      findVisualMatches(imageUrl).catch((err) => {
        console.error("[analyze] lens step failed:", err);
        return [];
      }),
    ]);

    const items = await Promise.all(
      vision.items.map(async (item) => {
        const matches = await searchAllMalls(item.searchQuery, mallIds, 6);
        return {
          category: item.category,
          label: item.label,
          colors: item.colors,
          searchQuery: item.searchQuery,
          matches,
        };
      })
    );

    // Re-rank each item's real (scraped) candidates against the source photo
    // so "매칭" actually means visually similar, not just keyword-matched.
    try {
      const rankings = await rerankByVisualSimilarity(
        imageUrl,
        items.map((item, index) => ({
          index,
          label: item.label,
          // Cap candidate images sent to the re-ranker. Each image is token-heavy,
          // and with Naver widening the pool this call would otherwise blow the
          // per-minute token limit. 5 per item is plenty to reorder the top hits.
          candidates: item.matches
            .filter((m) => !m.isSearchLink && m.imageUrl)
            .slice(0, 5)
            .map((m) => ({ id: m.id, imageUrl: m.imageUrl })),
        }))
      );

      items.forEach((item, index) => {
        const bestIds = rankings[index];
        if (!bestIds || bestIds.length === 0) return;
        const byId = new Map(item.matches.map((m) => [m.id, m] as [string, MallProduct]));
        const ranked = bestIds.map((id) => byId.get(id)).filter((m): m is MallProduct => Boolean(m));
        const rankedIds = new Set(ranked.map((m) => m.id));
        const rest = item.matches.filter((m) => !rankedIds.has(m.id));
        item.matches = [...ranked, ...rest];
      });
    } catch (err) {
      console.error("[analyze] visual re-rank step failed, keeping keyword-search order:", err);
    }

    res.json({
      id: `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceType: sourceType === "pinterest" ? "pinterest" : "upload",
      sourceImageUrl: imageUrl,
      sourceTitle,
      mood: vision.mood,
      visualMatches,
      items,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[analyze] failed:", err);
    // TEMP DEBUG: include stack to locate a Vercel-only ByteString bug — remove once fixed.
    res.status(500).json({ error: err.message || "분석 중 오류가 발생했습니다.", stack: err.stack });
  }
});
