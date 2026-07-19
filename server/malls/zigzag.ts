import { MallSearcher } from "./types.js";

// Zigzag is a fully client-rendered SPA — the search page ships no product
// data server-side, and the only documented API is partner/seller-authenticated.
// We link straight to the real search page.

function buildSearchUrl(query: string): string {
  return `https://zigzag.kr/search?keyword=${encodeURIComponent(query)}`;
}

export const zigzagSearcher: MallSearcher = {
  id: "zigzag",
  displayName: "지그재그",
  buildSearchUrl,
  async search() {
    return [];
  },
};
