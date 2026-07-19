// Public-profile Pinterest ingestion via RSS — no developer app, OAuth, or
// trial-access approval required. Pinterest exposes a per-user feed at
// https://www.pinterest.com/{username}/feed.rss for PUBLIC profiles. Secret
// boards / private profiles are not included (and will 404).

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface RssPin {
  id: string;
  imageUrl: string;
  title: string;
  link: string;
}

export class PinterestProfileError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "private_or_empty" | "fetch_failed"
  ) {
    super(message);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// Pinterest thumbnails come through as 236x; bump to a mid size that's big
// enough for reliable vision analysis without downloading originals.
function upscaleImage(url: string): string {
  return url.replace(/\/(236x|474x|564x)\//, "/736x/");
}

function parseRssItems(xml: string): RssPin[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  const pins: RssPin[] = [];

  for (const [, block] of items) {
    const link = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "").trim();
    const rawTitle = (block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").trim();
    const description = block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";
    const imgMatch = decodeEntities(description).match(/<img[^>]+src=["']([^"']+)["']/);
    if (!imgMatch) continue;

    const pinId = link.match(/\/pin\/(\d+)/)?.[1] || `${pins.length}`;
    pins.push({
      id: `rss-${pinId}`,
      imageUrl: upscaleImage(imgMatch[1]),
      title: decodeEntities(rawTitle) || "제목 없는 핀",
      link,
    });
  }
  return pins;
}

/** Fetches a public Pinterest profile's recent saved pins. */
export async function getProfilePins(username: string): Promise<RssPin[]> {
  const clean = username.trim().replace(/^@/, "").replace(/\/+$/, "");
  if (!clean) {
    throw new PinterestProfileError("사용자 이름이 비어 있습니다.", "not_found");
  }

  const url = `https://www.pinterest.com/${encodeURIComponent(clean)}/feed.rss`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT, Accept: "application/rss+xml,text/xml" },
    });
  } catch (err) {
    throw new PinterestProfileError(`핀터레스트에 접속하지 못했습니다: ${(err as Error).message}`, "fetch_failed");
  }

  if (res.status === 404) {
    throw new PinterestProfileError(
      `'${clean}' 프로필을 찾을 수 없어요. 아이디가 정확한지, 프로필이 공개인지 확인해 주세요.`,
      "not_found"
    );
  }

  const body = await res.text();

  // A private/JS profile returns the HTML app shell instead of XML.
  if (!body.includes("<rss") && !body.includes("<item>")) {
    throw new PinterestProfileError(
      `'${clean}'의 공개 핀을 읽지 못했어요. 프로필과 보드가 '공개(Public)'로 설정되어 있어야 해요.`,
      "private_or_empty"
    );
  }

  const pins = parseRssItems(body);
  if (pins.length === 0) {
    throw new PinterestProfileError(
      `'${clean}'에서 가져올 수 있는 공개 핀이 없어요. 보드가 공개인지 확인해 주세요.`,
      "private_or_empty"
    );
  }
  return pins;
}
