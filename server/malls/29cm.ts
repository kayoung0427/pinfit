import { MallSearcher } from "./types.js";

// 29CM's search results render client-side (React SPA hydration) — the initial
// HTML response has no product data to parse server-side, and the internal
// search-api subdomain sits behind Cloudflare bot management. We link straight
// to the real, working search results page instead of guessing at product data.

function buildSearchUrl(query: string): string {
  return `https://www.29cm.co.kr/store/search?keyword=${encodeURIComponent(query)}&sort=RECOMMENDED`;
}

export const cm29Searcher: MallSearcher = {
  id: "29cm",
  displayName: "29CM",
  buildSearchUrl,
  async search() {
    return [];
  },
};
