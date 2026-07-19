export type MallId = "musinsa" | "29cm" | "wconcept" | "zigzag" | "naver";

export interface MallProduct {
  id: string;
  mall: MallId;
  name: string;
  price: number | null;
  imageUrl?: string;
  productUrl: string;
  /** true = no confirmed live product, this is a deep-link to the mall's own search results page */
  isSearchLink: boolean;
  /** For aggregators (Naver): the actual store name to display, e.g. "무신사", "스타일난다" */
  mallLabel?: string;
}

export interface MallSearcher {
  id: MallId;
  displayName: string;
  buildSearchUrl(query: string): string;
  /** Attempt to fetch real product results. Return [] (not throw) if nothing found; throw only on hard failure. */
  search(query: string, limit: number): Promise<MallProduct[]>;
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function fetchHtml(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
