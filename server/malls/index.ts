import { MallId, MallProduct, MallSearcher } from "./types.js";
import { musinsaSearcher } from "./musinsa.js";
import { cm29Searcher } from "./29cm.js";
import { wconceptSearcher } from "./wconcept.js";
import { zigzagSearcher } from "./zigzag.js";
import { naverSearcher } from "./naver.js";

const ALL_SEARCHERS: Record<MallId, MallSearcher> = {
  musinsa: musinsaSearcher,
  "29cm": cm29Searcher,
  wconcept: wconceptSearcher,
  zigzag: zigzagSearcher,
  naver: naverSearcher,
};

export const MALL_IDS: MallId[] = ["musinsa", "29cm", "wconcept", "zigzag", "naver"];

export function mallDisplayName(id: MallId): string {
  return ALL_SEARCHERS[id].displayName;
}

/**
 * Searches every requested mall for a query. Malls that can return real
 * product data (currently just Musinsa) give up to `limit` real items.
 * Malls that can't be scraped reliably give a single honest deep-link
 * "card" pointing at that mall's own live search results instead of a
 * fabricated product.
 */
export async function searchAllMalls(
  query: string,
  mallIds: MallId[],
  limit = 6
): Promise<MallProduct[]> {
  const results = await Promise.all(
    mallIds.map(async (id): Promise<MallProduct[]> => {
      const searcher = ALL_SEARCHERS[id];
      if (!searcher) return [];
      try {
        const products = await searcher.search(query, limit);
        if (products.length > 0) return products;
      } catch (err) {
        console.error(`[malls] ${id} search failed for "${query}":`, (err as Error).message);
      }
      // Fallback: a single deep-link card, never a fabricated product.
      return [
        {
          id: `${id}-searchlink-${encodeURIComponent(query)}`,
          mall: id,
          name: `"${query}" 검색 결과 보기`,
          price: null,
          productUrl: searcher.buildSearchUrl(query),
          isSearchLink: true,
        },
      ];
    })
  );

  return results.flat();
}

export function buildAllSearchUrls(query: string, mallIds: MallId[]): Record<MallId, string> {
  const out: Partial<Record<MallId, string>> = {};
  for (const id of mallIds) {
    out[id] = ALL_SEARCHERS[id]?.buildSearchUrl(query);
  }
  return out as Record<MallId, string>;
}
