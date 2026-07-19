const PINTEREST_API_BASE = "https://api.pinterest.com/v5";
const PINTEREST_OAUTH_AUTHORIZE = "https://www.pinterest.com/oauth/";
const PINTEREST_OAUTH_TOKEN = `${PINTEREST_API_BASE}/oauth/token`;

// Scopes: read-only access to the user's boards & pins (their saved taste), plus basic profile.
const SCOPES = ["boards:read", "pins:read", "user_accounts:read"].join(",");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}. See .env.example.`);
  }
  return value;
}

export function isPinterestConfigured(): boolean {
  return Boolean(
    process.env.PINTEREST_CLIENT_ID &&
      process.env.PINTEREST_CLIENT_SECRET &&
      process.env.PINTEREST_REDIRECT_URI
  );
}

export function getAuthorizationUrl(state: string): string {
  const clientId = requireEnv("PINTEREST_CLIENT_ID");
  const redirectUri = requireEnv("PINTEREST_REDIRECT_URI");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${PINTEREST_OAUTH_AUTHORIZE}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

function basicAuthHeader(): string {
  const clientId = requireEnv("PINTEREST_CLIENT_ID");
  const clientSecret = requireEnv("PINTEREST_CLIENT_SECRET");
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const redirectUri = requireEnv("PINTEREST_REDIRECT_URI");
  const res = await fetch(PINTEREST_OAUTH_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pinterest token exchange failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(PINTEREST_OAUTH_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pinterest token refresh failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function pinterestGet(accessToken: string, path: string) {
  const res = await fetch(`${PINTEREST_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pinterest API error ${res.status} on ${path}: ${text}`);
  }
  return res.json();
}

export interface PinterestBoardDto {
  id: string;
  name: string;
  pinCount?: number;
  imageUrl?: string;
}

export async function getMyBoards(accessToken: string): Promise<PinterestBoardDto[]> {
  const data = await pinterestGet(accessToken, "/boards?page_size=100");
  const items = data.items || [];
  return items.map((b: any) => ({
    id: b.id,
    name: b.name,
    pinCount: b.pin_count,
    imageUrl: b.media?.image_cover_url,
  }));
}

export interface PinterestPinDto {
  id: string;
  imageUrl: string;
  title: string;
  boardId: string;
}

export async function getBoardPins(
  accessToken: string,
  boardId: string,
  pageSize = 25
): Promise<PinterestPinDto[]> {
  const data = await pinterestGet(accessToken, `/boards/${boardId}/pins?page_size=${pageSize}`);
  const items = data.items || [];
  return items
    .map((p: any): PinterestPinDto | null => {
      const images = p.media?.images;
      const imageUrl =
        images?.["1200x"]?.url || images?.["600x"]?.url || images?.originals?.url || null;
      if (!imageUrl) return null;
      return {
        id: p.id,
        imageUrl,
        title: p.title || p.description || "제목 없는 핀",
        boardId,
      };
    })
    .filter((p: PinterestPinDto | null): p is PinterestPinDto => p !== null);
}

export async function getMyRecentSavedPins(
  accessToken: string,
  pageSize = 25
): Promise<PinterestPinDto[]> {
  const data = await pinterestGet(accessToken, `/pins?page_size=${pageSize}`);
  const items = data.items || [];
  return items
    .map((p: any): PinterestPinDto | null => {
      const images = p.media?.images;
      const imageUrl =
        images?.["1200x"]?.url || images?.["600x"]?.url || images?.originals?.url || null;
      if (!imageUrl) return null;
      return {
        id: p.id,
        imageUrl,
        title: p.title || p.description || "제목 없는 핀",
        boardId: p.board_id || "recent",
      };
    })
    .filter((p: PinterestPinDto | null): p is PinterestPinDto => p !== null);
}

export async function getMyUsername(accessToken: string): Promise<string> {
  const data = await pinterestGet(accessToken, "/user_account");
  return data.username || "Pinterest User";
}
