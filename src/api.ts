import type { MallId, OutfitAnalysis, PinterestBoard, PinterestPin } from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `요청 실패 (${res.status})`);
  }
  return res.json();
}

export interface ConfigStatus {
  pinterestConfigured: boolean;
  visionConfigured: boolean;
  naverConfigured: boolean;
  lensConfigured: boolean;
  malls: MallId[];
}

export const getConfigStatus = () => jsonFetch<ConfigStatus>("/api/config-status");

export interface AuthStatus {
  connected: boolean;
  username?: string;
}

export const getAuthStatus = () => jsonFetch<AuthStatus>("/api/auth/pinterest/status");

export const logoutPinterest = () =>
  jsonFetch<{ ok: boolean }>("/api/auth/pinterest/logout", { method: "POST" });

export const getBoards = () =>
  jsonFetch<{ boards: PinterestBoard[] }>("/api/pinterest/boards").then((d) => d.boards);

export const getBoardPins = (boardId: string) =>
  jsonFetch<{ pins: PinterestPin[] }>(`/api/pinterest/boards/${boardId}/pins`).then((d) => d.pins);

export const getRecentPins = () =>
  jsonFetch<{ pins: PinterestPin[] }>("/api/pinterest/recent-pins").then((d) => d.pins);

export interface RssPin {
  id: string;
  imageUrl: string;
  title: string;
  link: string;
}

export const getProfilePins = (username: string) =>
  jsonFetch<{ username: string; pins: RssPin[] }>(
    `/api/pinterest/feed?username=${encodeURIComponent(username)}`
  );

export interface AnalyzeRequest {
  imageUrl: string;
  sourceType: "pinterest" | "upload";
  sourceTitle?: string;
  malls: MallId[];
}

export const analyzeOutfit = (req: AnalyzeRequest) =>
  jsonFetch<OutfitAnalysis>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(req),
  });
