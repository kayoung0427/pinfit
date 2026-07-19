import { MallSearcher } from "./types.js";

// W Concept's search page server-renders only aggregate counts/filters; the
// actual product grid is fetched client-side against a gateway-key-protected
// API we don't have credentials for. We link straight to the real search page.

function buildSearchUrl(query: string): string {
  return `https://www.wconcept.co.kr/Search?keyword=${encodeURIComponent(query)}`;
}

export const wconceptSearcher: MallSearcher = {
  id: "wconcept",
  displayName: "W컨셉",
  buildSearchUrl,
  async search() {
    return [];
  },
};
