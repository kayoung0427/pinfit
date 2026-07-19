import type { Request, Response } from "express";
import { refreshAccessToken } from "./pinterestClient.js";

// Computed per-call, not at module load — dotenv.config() in index.ts runs
// after this module's imports are evaluated, so NODE_ENV wouldn't be set yet.
function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    signed: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year — bounded by the refresh token's real lifetime anyway
  };
}

interface TokenBundle {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export function setAuthCookies(res: Response, tokens: TokenBundle) {
  const opts = cookieOpts();
  res.cookie("pt_access", tokens.access_token, opts);
  if (tokens.refresh_token) {
    res.cookie("pt_refresh", tokens.refresh_token, opts);
  }
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  res.cookie("pt_expires", String(expiresAt), opts);
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("pt_access");
  res.clearCookie("pt_refresh");
  res.clearCookie("pt_expires");
  res.clearCookie("pt_username");
}

/** Returns a valid access token, transparently refreshing it if expired. Null if not connected. */
export async function getValidAccessToken(req: Request, res: Response): Promise<string | null> {
  const access = req.signedCookies?.pt_access;
  const refresh = req.signedCookies?.pt_refresh;
  const expiresAt = Number(req.signedCookies?.pt_expires || 0);

  if (!access) return null;

  const isExpiringSoon = !expiresAt || Date.now() > expiresAt - 60_000;
  if (!isExpiringSoon) return access;

  if (!refresh) return access; // best effort, let the API call itself fail if truly expired

  try {
    const tokens = await refreshAccessToken(refresh);
    setAuthCookies(res, { ...tokens, refresh_token: tokens.refresh_token || refresh });
    return tokens.access_token;
  } catch (err) {
    console.error("[session] token refresh failed:", (err as Error).message);
    clearAuthCookies(res);
    return null;
  }
}
